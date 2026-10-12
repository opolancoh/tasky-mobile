import { create } from 'zustand';

import { pathOf, redact, type HttpLogger } from '@/core/http/httpLog';
import type { ApiError } from '@/core/http/problem';

/** One API call in the Network log: its request, and its response or error once it ends. Secrets are "***". */
export interface NetworkEntry {
  id: number;
  method: string;
  path: string;
  /** ISO 8601. */
  startedAt: string;
  requestBody?: unknown;
  /** Retries and refreshes along the way ("retry 1/3", "refreshing"). */
  notes: string[];
  status?: number;
  ms?: number;
  responseBody?: unknown;
  error?: { code: string; traceId?: string; errors?: Record<string, string[]> };
}

const MAX = 100;

/**
 * The Network log (Me › About, for support and admin): the last 100 API calls while recording is on, kept in memory
 * only (gone when the app closes). Fed by the HTTP client's `log` (app/services.ts); off, it costs nothing.
 */
export const useNetworkLog = create<{ recording: boolean; entries: NetworkEntry[]; setRecording(on: boolean): void; clear(): void }>()((set) => ({
  recording: false,
  entries: [],
  setRecording: (recording) => set({ recording }),
  clear: () => set({ entries: [] }),
}));

const update = (id: number, change: (e: NetworkEntry) => NetworkEntry) =>
  useNetworkLog.setState((s) => ({ entries: s.entries.map((e) => (e.id === id ? change(e) : e)) }));

const errorOf = (e: ApiError): NetworkEntry['error'] => ({ code: e.code, traceId: e.traceId, errors: Object.keys(e.errors).length ? e.errors : undefined });

/** The HTTP client's logger for the Network log: records only while recording is on. */
export const networkRecorder: HttpLogger = {
  request(id, method, url, body, attempt) {
    if (!useNetworkLog.getState().recording) return;
    if (attempt > 0) return; // a retry stays on its first entry
    const entry: NetworkEntry = { id, method, path: pathOf(url), startedAt: new Date().toISOString(), requestBody: redact(body, true), notes: [] };
    useNetworkLog.setState((s) => ({ entries: [entry, ...s.entries].slice(0, MAX) }));
  },
  response(id, _method, _url, status, ms, body) {
    update(id, (e) => ({ ...e, status, ms, responseBody: redact(body), error: undefined }));
  },
  error(id, _method, _url, error, ms, next) {
    update(id, (e) => ({ ...e, status: error.status || undefined, ms, error: errorOf(error), notes: next ? [...e.notes, next] : e.notes }));
  },
};
