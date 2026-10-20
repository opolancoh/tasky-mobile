/**
 * An error from the API (a problem document) or from getting to it.
 * Switch on `code`, never on `title`: the text shown to the user comes from the app's translations.
 */
export class ApiError extends Error {
  constructor(
    /** HTTP status; 0 when the request never got a response (offline, timeout). */
    readonly status: number,
    /** The problem's `code`, e.g. "auth.invalid_credentials"; "network" or "timeout" without a response. */
    readonly code: string,
    /** Field errors of a validation problem, keyed by camelCase field name. */
    readonly errors: Record<string, string[]> = {},
    readonly traceId?: string,
    /** Seconds from a `Retry-After` header. */
    readonly retryAfter?: number,
    title?: string,
  ) {
    super(title ?? code);
    this.name = 'ApiError';
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/** Azignia couldn't be reached: no response (offline, timeout) or a 502, 503 or 504 from what's in front of it (M90). */
export const isConnectionError = (e: unknown): e is ApiError =>
  isApiError(e) && (e.code === 'network' || e.code === 'timeout' || e.status === 502 || e.status === 503 || e.status === 504);

interface ProblemDocument {
  title?: string;
  code?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

/** `text`: the response body as received. */
export function toApiError(response: Response, text: string): ApiError {
  let body: ProblemDocument = {};
  try {
    body = (JSON.parse(text) ?? {}) as ProblemDocument;
  } catch {
    // Not JSON (a proxy's error page): keep the status only.
  }
  const retryAfter = Number(response.headers.get('Retry-After'));
  return new ApiError(
    response.status,
    body.code ?? `http.${response.status}`,
    body.errors ?? {},
    body.traceId,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    body.title,
  );
}
