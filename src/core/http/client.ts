import type { Version } from '../types';
import type { HttpLogger } from './httpLog';
import { ApiError, toApiError } from './problem';

/** How the client gets and renews the access token. Set by the session once tokens exist. */
export interface AuthHooks {
  /** A valid access token, refreshed first if it is about to expire; null when signed out. */
  accessToken(): Promise<string | null>;
  /** Renews the tokens after a 401. False when the session is over. */
  refresh(): Promise<boolean>;
}

export interface HttpClientOptions {
  /** e.g. "http://localhost:5186/api/v1" */
  baseUrl: string;
  /** Headers sent on every request: X-Client, X-Device-Name, Accept-Language. */
  headers: () => Record<string, string>;
  /** A new UUID, for Idempotency-Key. */
  newId: () => string;
  timeoutMs?: number;
  /** A 426: the API no longer accepts this app version (X-Client); the app asks the user to update. */
  onClientTooOld?: () => void;
  /** Development only: every request, response and error (httpLog.ts). */
  log?: HttpLogger;
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** The version last read; sent as If-Match on updates, deletes and commands. */
  ifMatch?: Version;
  /** No Authorization header and no refresh on 401 (sign-in, refresh, sign-out). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpClient {
  /** The configured base URL, e.g. "http://localhost:5186/api/v1". */
  readonly baseUrl: string;
  /** A path is relative to `baseUrl`; a full URL (http…) is used as is, e.g. the API's /api/version. */
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T = void>(path: string, options?: RequestOptions): Promise<T>;
  put<T = void>(path: string, options?: RequestOptions): Promise<T>;
  patch<T = void>(path: string, options?: RequestOptions): Promise<T>;
  delete<T = void>(path: string, options?: RequestOptions): Promise<T>;
  setAuth(auth: AuthHooks | null): void;
}

const RETRYABLE = new Set([0, 502, 503, 504]);
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetch with the API's rules (02-api-integration.md): auth header, one refresh and retry on 401,
 * Idempotency-Key on every POST (reused by its retries), retries with backoff for network errors,
 * timeouts, 502, 503 and 504 (honoring Retry-After), and problem documents turned into ApiError.
 */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  const timeoutMs = options.timeoutMs ?? 15_000;
  let auth: AuthHooks | null = null;
  let seq = 0;
  const log = options.log;

  function url(path: string, query?: RequestOptions['query']): string {
    const params = Object.entries(query ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    const base = /^https?:\/\//.test(path) ? path : `${options.baseUrl}${path}`;
    return `${base}${params ? `?${params}` : ''}`;
  }

  async function send(method: Method, path: string, opts: RequestOptions, idempotencyKey?: string): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json', ...options.headers() };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.ifMatch !== undefined) headers['If-Match'] = `"${opts.ifMatch}"`;
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (!opts.anonymous && auth) {
      const token = await auth.accessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    opts.signal?.addEventListener('abort', onAbort);
    try {
      return await fetch(url(path, opts.query), {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      });
    } catch {
      if (opts.signal?.aborted) throw new ApiError(0, 'aborted');
      throw new ApiError(0, controller.signal.aborted ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
    }
  }

  async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
    const idempotencyKey = method === 'POST' ? options.newId() : undefined;
    let refreshed = false;
    const id = ++seq;
    const target = log ? url(path, opts.query) : '';

    for (let attempt = 0; ; attempt++) {
      const started = Date.now();
      log?.request(id, method, target, opts.body, attempt);
      let response: Response;
      try {
        response = await send(method, path, opts, idempotencyKey);
      } catch (e) {
        const error = e as ApiError;
        const retry = error.code !== 'aborted' && attempt < MAX_RETRIES;
        log?.error(id, method, target, error, Date.now() - started, retry ? `retry ${attempt + 1}/${MAX_RETRIES}` : undefined);
        if (retry) {
          await sleep(backoff(attempt));
          continue;
        }
        throw error;
      }

      if (response.ok) {
        const text = response.status === 204 ? '' : await response.text();
        const body = text ? JSON.parse(text) : undefined;
        log?.response(id, method, target, response.status, Date.now() - started, body);
        return body as T;
      }

      const error = await toApiError(response);
      if (response.status === 401 && !opts.anonymous && auth && !refreshed) {
        refreshed = true;
        log?.error(id, method, target, error, Date.now() - started, 'refreshing');
        if (await auth.refresh()) continue;
      }

      if (response.status === 426) options.onClientTooOld?.();
      const retry = RETRYABLE.has(response.status) && attempt < MAX_RETRIES;
      log?.error(id, method, target, error, Date.now() - started, retry ? `retry ${attempt + 1}/${MAX_RETRIES}` : undefined);
      if (retry) {
        await sleep(error.retryAfter ? error.retryAfter * 1000 : backoff(attempt));
        continue;
      }
      throw error;
    }
  }

  return {
    baseUrl: options.baseUrl,
    get: (path, opts) => request('GET', path, opts),
    post: (path, opts) => request('POST', path, opts),
    put: (path, opts) => request('PUT', path, opts),
    patch: (path, opts) => request('PATCH', path, opts),
    delete: (path, opts) => request('DELETE', path, opts),
    setAuth: (hooks) => {
      auth = hooks;
    },
  };
}

/** 1, 2, 4 seconds, with jitter. */
function backoff(attempt: number): number {
  const base = 1000 * 2 ** attempt;
  return base / 2 + Math.random() * (base / 2);
}
