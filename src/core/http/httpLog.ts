import type { ApiError } from './problem';

/** What the HTTP client reports, one call per event; `id` pairs a request with its response or error. */
export interface HttpLogger {
  request(id: number, method: string, url: string, body: unknown, attempt: number): void;
  response(id: number, method: string, url: string, status: number, ms: number, body: unknown): void;
  /** `next`: what the client does about it ("retry 1/3", "refreshing"); none when it gives up. */
  error(id: number, method: string, url: string, error: ApiError, ms: number, next?: string): void;
}

export type HttpLogLevel = 'off' | 'errors' | 'all';

const MAX = 120;
/** Keys never printed: passwords and tokens anywhere, and a request's `code` (the email code). */
const SECRET = /password|secret|^(access|refresh)?token$/i;

/** A copy with the same secrets as `summarize` replaced by "***", for a full view (the app's Network log). */
export function redact(value: unknown, isRequest = false): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, isRequest));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET.test(k) || (isRequest && k === 'code') ? '***' : redact(v, isRequest)]),
  );
}

/** Several loggers as one: the terminal log and the Network log. */
export function combineLoggers(...loggers: (HttpLogger | undefined)[]): HttpLogger | undefined {
  const all = loggers.filter((l): l is HttpLogger => !!l);
  if (!all.length) return undefined;
  return {
    request: (...args) => all.forEach((l) => l.request(...args)),
    response: (...args) => all.forEach((l) => l.response(...args)),
    error: (...args) => all.forEach((l) => l.error(...args)),
  };
}

/** Compact JSON: arrays as "[n items]", objects two levels deep, secrets as "***", cut at 120 characters. */
export function summarize(value: unknown, isRequest = false): string {
  const text = compact(value, 0, isRequest);
  return text.length > MAX ? `${text.slice(0, MAX - 1)}…` : text;
}

function compact(value: unknown, depth: number, isRequest: boolean): string {
  if (value === undefined) return '';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.length} item${value.length === 1 ? '' : 's'}]`;
  if (depth >= 2) return '{…}';
  const fields = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `"${k}":${SECRET.test(k) || (isRequest && k === 'code') ? '"***"' : compact(v, depth + 1, isRequest)}`);
  return `{${fields.join(',')}}`;
}

/** ANSI colors: the Metro terminal shows them. Requests cyan, 2xx green, 4xx and retries yellow, 5xx and no response red. */
const paint = (code: number) => (text: string) => `\x1b[${code}m${text}\x1b[0m`;
const cyan = paint(36), green = paint(32), yellow = paint(33), red = paint(31), dim = paint(2);
const bold = (text: string) => `\x1b[1m${text}\x1b[22m`;

/** "/api/v1/home?limit=5" from the full URL. */
export const pathOf = (url: string) => url.replace(/^https?:\/\/[^/]+/, '');
const tag = (id: number) => `#${id}`.padEnd(5);

/**
 * Development only (wired in app/services.ts under __DEV__): one line per event in the Metro terminal, a request
 * and its response paired by number. `errors` prints only errors.
 *   → #14  2026-10-12T16:44:27.246Z  GET    /api/v1/home?limit=5
 *   ← #14  2026-10-12T16:44:27.342Z  200    {"invitations":[0 items],…}  96ms
 *   ✕ #16  2026-10-12T16:44:30.190Z  401    {"code":"auth.token_expired"}  12ms → refreshing
 */
export function createConsoleHttpLogger(level: HttpLogLevel, print: (line: string) => void = console.log): HttpLogger | undefined {
  if (level === 'off') return undefined;
  const all = level === 'all';
  const now = () => new Date().toISOString();
  return {
    request(id, method, url, body, attempt) {
      if (!all) return;
      const retry = attempt > 0 ? yellow(`  (retry ${attempt})`) : '';
      print(`${cyan(`→ ${tag(id)}`)} ${dim(now())}  ${cyan(bold(method.padEnd(7)))}${pathOf(url)}${body === undefined ? '' : `  ${dim(summarize(body, true))}`}${retry}`);
    },
    response(id, method, url, status, ms, body) {
      if (!all) return;
      print(`${green(`← ${tag(id)}`)} ${dim(now())}  ${green(bold(String(status).padEnd(7)))}${body === undefined ? '' : `${dim(summarize(body))}  `}${ms}ms`);
    },
    error(id, method, url, error, ms, next) {
      const status = error.status === 0 ? error.code.toUpperCase() : String(error.status);
      const detail = summarize({
        code: error.code,
        // A validation problem's first message per field: {"title":"Required"}.
        errors: Object.keys(error.errors).length ? Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v[0]])) : undefined,
        traceId: error.traceId,
      });
      const color = error.status >= 400 && error.status < 500 ? yellow : red;
      print(`${color(`✕ ${tag(id)}`)} ${dim(now())}  ${color(bold(status.padEnd(7)))}${detail}  ${ms}ms${next ? yellow(` → ${next}`) : ''}`);
    },
  };
}
