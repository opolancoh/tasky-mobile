import { pathOf, type HttpLogger } from '@/core/http/httpLog';

/** One step before an error: a screen opened, or an API call that ended (Error reports, M89). */
export type Breadcrumb =
  | { at: string; kind: 'screen'; name: string }
  | { at: string; kind: 'api'; method: string; path: string; status: number; traceId?: string };

const MAX = 20;
/** A failed call this recent is the one an error most likely came from. */
const TRACE_WINDOW_MS = 60_000;

let crumbs: Breadcrumb[] = [];
let lastFailure: { traceId: string; at: number } | null = null;

const push = (crumb: Breadcrumb) => {
  crumbs = [...crumbs.slice(1 - MAX), crumb];
};

/** The last 20 steps, oldest first. */
export const breadcrumbs = () => crumbs;

/** The screen on top now, from the last screen crumb. */
export const currentScreen = () => crumbs.findLast((c) => c.kind === 'screen')?.name;

/** The trace id of a failed API call in the last minute, for `requestTraceId`. */
export const recentFailedTraceId = () => (lastFailure && Date.now() - lastFailure.at < TRACE_WINDOW_MS ? lastFailure.traceId : undefined);

/** From the navigator's state changes: the route now on top. */
export function addScreenCrumb(name: string | undefined) {
  if (name && currentScreen() !== name) push({ at: new Date().toISOString(), kind: 'screen', name });
}

/** Path without the query string: queries can carry what the user typed (search). */
const bare = (url: string) => pathOf(url).split('?')[0]!;

/** The HTTP client's log, kept as breadcrumbs: each call once it ends (status 0 when there was no response). */
export const breadcrumbRecorder: HttpLogger = {
  request: () => {},
  response: (_id, method, url, status) => push({ at: new Date().toISOString(), kind: 'api', method, path: bare(url), status }),
  error: (_id, method, url, error, _ms, next) => {
    if (next || error.code === 'aborted') return;   // retried or refreshed: only the end counts
    push({ at: new Date().toISOString(), kind: 'api', method, path: bare(url), status: error.status, traceId: error.traceId });
    if (error.traceId) lastFailure = { traceId: error.traceId, at: Date.now() };
  },
};
