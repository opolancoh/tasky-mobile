import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appInfo } from '@/shared/appInfo';
import { useSessionStore } from '@/shared/session/sessionStore';

import { breadcrumbs, currentScreen, recentFailedTraceId, type Breadcrumb } from './breadcrumbs';

/** Where an error was caught: the error boundary, the global handler, or a promise nobody handled. */
export type ErrorSource = 'render' | 'global' | 'promise';
/** new: not tried yet · sending · sent · pending: a send failed; only Send (Me › About › Error reports) tries again. */
export type ReportStatus = 'new' | 'sending' | 'sent' | 'pending';

/** One JavaScript error, as kept on the phone (M89). What goes to the API is `toRequest`'s. */
export interface ErrorReport {
  id: string;
  occurredAt: string;
  message: string;
  code?: string;
  stack?: string;
  componentStack?: string;
  screen?: string;
  appVersion: string;
  platform: string;
  deviceInfo: string;
  environment: 'development' | 'production';
  requestTraceId?: string;
  /** Who was signed in: the report goes with a token only while that same person is signed in. */
  userId: string | null;
  fatal: boolean;
  source: ErrorSource;
  breadcrumbs: Breadcrumb[];
  status: ReportStatus;
}

const MAX = 50;
// The API's limits (azignia-api/docs/error-logs.md).
const cut = (text: string | undefined, max: number) => (text && text.length > max ? `${text.slice(0, max - 1)}…` : text || undefined);

interface ErrorReportsState {
  reports: ErrorReport[];
  /** The fatal error now on screen (Something went wrong), by id. */
  crashed: string | null;
  add(report: ErrorReport): void;
  setStatus(ids: string[], status: ReportStatus): void;
  remove(id: string): void;
  clear(): void;
}

/** Error reports kept on this phone (AsyncStorage), newest first, the last 50 (M89). */
export const useErrorReports = create<ErrorReportsState>()(
  persist(
    (set) => ({
      reports: [],
      crashed: null,
      add: (report) => set((s) => ({ reports: [report, ...s.reports].slice(0, MAX) })),
      setStatus: (ids, status) => set((s) => ({ reports: s.reports.map((r) => (ids.includes(r.id) ? { ...r, status } : r)) })),
      remove: (id) => set((s) => ({ reports: s.reports.filter((r) => r.id !== id) })),
      clear: () => set({ reports: [] }),
    }),
    {
      name: 'azignia.errorReports',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ reports: s.reports }),
      // Saved before it could go (the app closed, or was reloaded mid-send): this launch sends it.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setStatus(state.reports.filter((r) => r.status === 'sending').map((r) => r.id), 'new');
        sendNew();
      },
    },
  ),
);

let target: { url: string; token(): Promise<string | null> } | null = null;

/** From app/services.ts: the endpoint, and the access token if there is one (never refreshed for this). */
export function configureErrorReports(options: { url: string; token(): Promise<string | null> }) {
  target = options;
  sendNew();
}

/**
 * Reports never tried (saved before they could go): sent once the store is read, the endpoint is known and the launch
 * has found out who is signed in (so a report goes with its own account's token).
 */
function sendNew() {
  if (!target || !useErrorReports.persist.hasHydrated() || useSessionStore.getState().status === 'loading') return;
  void sendReports(useErrorReports.getState().reports.filter((r) => r.status === 'new').map((r) => r.id));
}

const asError = (value: unknown): { name?: string; message: string; stack?: string } =>
  value instanceof Error ? value : { message: typeof value === 'string' ? value : JSON.stringify(value) ?? String(value) };

/** Saves an error and sends it once. Returns its id. */
export function recordError(value: unknown, source: ErrorSource, fatal: boolean, componentStack?: string): string {
  const error = asError(value);
  const report: ErrorReport = {
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    message: cut(error.message, 4000) || 'Unknown error',
    code: cut(error.name, 50),
    stack: cut(error.stack, 20_000),
    componentStack: cut(componentStack?.trim(), 20_000),
    screen: currentScreen(),
    appVersion: appInfo.build ? `${appInfo.version} (${appInfo.build})` : appInfo.expoGo ? `${appInfo.version} (Expo Go)` : appInfo.version,
    platform: Platform.OS,
    deviceInfo: [Device.modelName, `${Device.osName ?? Platform.OS} ${Device.osVersion ?? ''}`.trim()].filter(Boolean).join(', '),
    environment: __DEV__ || appInfo.expoGo ? 'development' : 'production',
    requestTraceId: recentFailedTraceId(),
    userId: useSessionStore.getState().userId,
    fatal,
    source,
    breadcrumbs: breadcrumbs(),
    status: 'new',
  };
  useErrorReports.getState().add(report);
  void sendReports([report.id]);
  return report.id;
}

/** What POST /logging/client-errors takes. The id makes a resend harmless. */
const toRequest = (r: ErrorReport) => ({
  id: r.id,
  occurredAt: r.occurredAt,
  message: r.message,
  code: r.code,
  stack: r.stack,
  componentStack: r.componentStack,
  screen: r.screen,
  appVersion: r.appVersion,
  platform: r.platform,
  deviceInfo: r.deviceInfo,
  environment: r.environment,
  requestTraceId: r.requestTraceId,
  context: cut(JSON.stringify({ fatal: r.fatal, source: r.source, breadcrumbs: r.breadcrumbs }), 10_000),
});

/**
 * Sends these reports: a plain fetch, never the API client (it refreshes and could sign out). The signed-in person's
 * own reports go with their token (linked to them); anyone else's, or one made signed out, go without (linked to no one).
 * Sent on success; Pending on any failure, with no retry of its own.
 */
export async function sendReports(ids: string[]) {
  const me = useSessionStore.getState().userId;
  const mine = (r: ErrorReport) => !!me && r.userId === me;
  const chosen = useErrorReports.getState().reports.filter((r) => ids.includes(r.id));
  await Promise.all([sendBatch(chosen.filter(mine).map((r) => r.id), true), sendBatch(chosen.filter((r) => !mine(r)).map((r) => r.id), false)]);
}

async function sendBatch(ids: string[], withToken: boolean) {
  const to = target;
  if (!to) return;   // configureErrorReports sends it
  const store = useErrorReports.getState();
  const reports = store.reports.filter((r) => ids.includes(r.id) && r.status !== 'sending' && r.status !== 'sent');
  if (!reports.length) return;
  const sending = reports.map((r) => r.id);
  store.setStatus(sending, 'sending');
  let ok = false;
  try {
    const token = withToken ? await to.token().catch(() => null) : null;
    const response = await fetch(to.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(reports.map(toRequest)),
    });
    ok = response.ok;
  } catch {
    ok = false;
  }
  useErrorReports.getState().setStatus(sending, ok ? 'sent' : 'pending');
}

/** Send all: every report not sent yet. */
export const sendPending = () => sendReports(useErrorReports.getState().reports.filter((r) => r.status === 'pending' || r.status === 'new').map((r) => r.id));

// The launch found out who is signed in, or someone else signed in: send what's waiting with the right token.
useSessionStore.subscribe((s, prev) => {
  if (s.status !== prev.status || s.userId !== prev.userId) sendNew();
});
