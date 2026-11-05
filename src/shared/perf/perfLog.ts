import { AppState } from 'react-native';
import { create } from 'zustand';

import type { HttpLogger } from '@/core/http/httpLog';
import { currentScreen } from '@/shared/errors/breadcrumbs';
import { useSessionStore } from '@/shared/session/sessionStore';

import { perfCounts } from './counters';

/** Ten seconds of the app, while recording. */
export interface PerfSample {
  /** ISO 8601, the end of the 10 s. */
  at: string;
  screen?: string;
  state: string;
  requests: number;
  retries: number;
  failed: number;
  pushes: number;
  /** Running at the end of the 10 s. */
  skeletons: number;
  spinners: number;
  fetching: number;
  mutating: number;
  /** How late a 1 s timer ran (ms): the longest and the total. A busy JS thread makes both grow. */
  lagMax: number;
  lagTotal: number;
}

const EVERY = 10;
const TICK_MS = 1000;
/** A tick this late was the app suspended, not a busy thread. */
const SUSPENDED_MS = 5000;
const MAX = 180;

let sources = { fetching: () => 0, mutating: () => 0 };

/** From app/services.ts: what React Query is doing now. */
export function configurePerfLog(from: typeof sources) {
  sources = from;
}

interface PerfLogState {
  recording: boolean;
  samples: PerfSample[];
  setRecording(on: boolean): void;
  clear(): void;
}

/**
 * The Perf log (Me › About, support and admin), temporary: while recording, one sample every 10 s of what keeps the
 * phone busy, the last 30 minutes, in memory only. Remove it once the heat is found.
 */
export const usePerfLog = create<PerfLogState>()((set) => ({
  recording: false,
  samples: [],
  setRecording: (recording) => {
    set({ recording });
    if (recording) start();
    else stop();
  },
  clear: () => set({ samples: [] }),
}));

useSessionStore.subscribe((s, prev) => {
  if (s.userId === prev.userId) return;
  stop();
  usePerfLog.setState({ recording: false, samples: [] });
});

let timer: ReturnType<typeof setInterval> | null = null;

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

function start() {
  stop();
  let base = { ...perfCounts };
  let ticks = 0, lagMax = 0, lagTotal = 0;
  let expected = Date.now() + TICK_MS;
  timer = setInterval(() => {
    const now = Date.now();
    const late = now - expected;
    expected = now + TICK_MS;
    if (late > 0 && late < SUSPENDED_MS && AppState.currentState === 'active') {
      lagMax = Math.max(lagMax, late);
      lagTotal += late;
    }
    if (++ticks < EVERY) return;
    const counts = { ...perfCounts };
    const sample: PerfSample = {
      at: new Date(now).toISOString(),
      screen: currentScreen(),
      state: AppState.currentState ?? 'unknown',
      requests: counts.requests - base.requests,
      retries: counts.retries - base.retries,
      failed: counts.failed - base.failed,
      pushes: counts.pushes - base.pushes,
      skeletons: counts.skeletons,
      spinners: counts.spinners,
      fetching: sources.fetching(),
      mutating: sources.mutating(),
      lagMax,
      lagTotal,
    };
    base = counts;
    ticks = lagMax = lagTotal = 0;
    usePerfLog.setState((s) => ({ samples: [sample, ...s.samples].slice(0, MAX) }));
  }, TICK_MS);
}

/** The HTTP client's logger for the Perf log: counts requests, retries and calls that failed in the end. */
export const perfRecorder: HttpLogger = {
  request: (_id, _method, _url, _body, attempt) => {
    perfCounts.requests++;
    if (attempt > 0) perfCounts.retries++;
  },
  response: () => {},
  error: (_id, _method, _url, error, _ms, next) => {
    if (!next && error.code !== 'aborted') perfCounts.failed++;
  },
};

/** "req 3 · retry 0 · failed 0 · push 0 · skel 2 · spin 0 · fetch 1 · mut 0 · lag 40/120 ms" */
export const sampleLine = (s: PerfSample) =>
  `req ${s.requests} · retry ${s.retries} · failed ${s.failed} · push ${s.pushes} · skel ${s.skeletons} · spin ${s.spinners} · fetch ${s.fetching} · mut ${s.mutating} · lag ${s.lagMax}/${s.lagTotal} ms`;

/** Something kept running: an animation, a request, a fetch or a busy JS thread. */
export const isBusy = (s: PerfSample) =>
  s.requests > 0 || s.skeletons > 0 || s.spinners > 0 || s.fetching > 0 || s.mutating > 0 || s.lagTotal > 500;
