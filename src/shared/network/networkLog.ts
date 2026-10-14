import { create } from 'zustand';

import { pathOf, redact, redactHeaders, type HttpExchange, type HttpLogger } from '@/core/http/httpLog';
import { useSessionStore } from '@/shared/session/sessionStore';

/** One API call in the Network log: its request, and its response or error once it ends. Secrets are "***". */
export interface NetworkEntry {
  id: number;
  method: string;
  /** The full URL, query included. */
  url: string;
  /** "/api/v1/home?limit=5" */
  path: string;
  /** ISO 8601. */
  startedAt: string;
  /** As sent; Authorization as "Bearer ***". */
  requestHeaders: Record<string, string>;
  /** Pretty JSON, cut at 8 KB. */
  requestBody?: string;
  /** An access token went with it. */
  tokenSent: boolean;
  /** Retries and refreshes along the way ("retry 1/3", "refreshing"). */
  notes: string[];
  /** None without a response (network, timeout). */
  status?: number;
  ms?: number;
  /** Characters in the response body. */
  size?: number;
  responseHeaders?: Record<string, string>;
  /** Pretty JSON (or the text as received, e.g. a proxy's page), cut at 8 KB. */
  responseBody?: string;
  /** The ApiError code when it failed: "task.not_found", "http.500", "timeout". */
  errorCode?: string;
  /** The API's trace id from a problem document; none means the API didn't write the answer. */
  traceId?: string;
}

const MAX = 100;
const MAX_BODY = 8_000;

interface NetworkLogState {
  /** The signed-in user has a platform role (support or admin); set by NetworkLogAccess. */
  allowed: boolean;
  recording: boolean;
  entries: NetworkEntry[];
  setRecording(on: boolean): void;
  clear(): void;
}

/** Ids of the calls in the log: a response for any other call costs one Set lookup. */
const logged = new Set<number>();

/**
 * The Network log (Me › About, support and admin, M53): the last 100 API calls while recording is on, kept in
 * memory only. Fed by the HTTP client's `log` (app/services.ts). Records only for a platform role; losing it,
 * signing out or another user signing in turns it off and empties it.
 */
export const useNetworkLog = create<NetworkLogState>()((set) => ({
  allowed: false,
  recording: false,
  entries: [],
  setRecording: (recording) => set((s) => ({ recording: recording && s.allowed })),
  clear: () => {
    logged.clear();
    set({ entries: [] });
  },
}));

/** From NetworkLogAccess: whether the signed-in user may record. */
export function setNetworkLogAllowed(allowed: boolean) {
  if (allowed) return useNetworkLog.setState({ allowed: true });
  logged.clear();
  useNetworkLog.setState({ allowed: false, recording: false, entries: [] });
}

useSessionStore.subscribe((s, prev) => {
  if (s.userId !== prev.userId) setNetworkLogAllowed(false);
});

/** Pretty JSON with secrets as "***", or the text as received; cut at 8 KB. */
function bodyText(value: unknown, isRequest = false): string | undefined {
  if (value === undefined || value === '') return undefined;
  const text = typeof value === 'string' ? value : JSON.stringify(redact(value, isRequest), null, 2);
  return text.length > MAX_BODY ? `${text.slice(0, MAX_BODY)}\n…[+${text.length - MAX_BODY} characters]` : text;
}

/** An error's body: JSON is parsed so its secrets are masked; anything else (an HTML page) as is. */
function errorBodyText(text: string): string | undefined {
  try {
    return bodyText(JSON.parse(text));
  } catch {
    return bodyText(text);
  }
}

const headersOf = (headers: Headers) => {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
};

const update = (id: number, change: (e: NetworkEntry) => NetworkEntry) =>
  useNetworkLog.setState((s) => ({ entries: s.entries.map((e) => (e.id === id ? change(e) : e)) }));

const received = (exchange: HttpExchange) => ({ size: exchange.text.length, responseHeaders: headersOf(exchange.headers) });

/** The HTTP client's logger for the Network log: records only while recording; other calls cost a lookup. */
export const networkRecorder: HttpLogger = {
  request(id, method, url, body, attempt, headers) {
    const s = useNetworkLog.getState();
    if (!s.recording || !s.allowed || attempt > 0) return;   // a retry stays on its first entry
    logged.add(id);
    const entry: NetworkEntry = {
      id,
      method,
      url,
      path: pathOf(url),
      startedAt: new Date().toISOString(),
      requestHeaders: redactHeaders(headers),
      requestBody: bodyText(body, true),
      tokenSent: !!headers.Authorization,
      notes: [],
    };
    const entries = [entry, ...s.entries];
    entries.slice(MAX).forEach((e) => logged.delete(e.id));
    useNetworkLog.setState({ entries: entries.slice(0, MAX) });
  },
  response(id, _method, _url, status, ms, body, exchange) {
    if (!logged.has(id)) return;
    update(id, (e) => ({ ...e, status, ms, ...received(exchange), responseBody: bodyText(body), errorCode: undefined, traceId: undefined }));
  },
  error(id, _method, _url, error, ms, next, exchange) {
    if (!logged.has(id)) return;
    update(id, (e) => ({
      ...e,
      status: error.status || undefined,
      ms,
      ...(exchange ? { ...received(exchange), responseBody: errorBodyText(exchange.text) } : {}),
      errorCode: error.code,
      traceId: error.traceId,
      notes: next ? [...e.notes, next] : e.notes,
    }));
  },
};
