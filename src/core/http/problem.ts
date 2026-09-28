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

interface ProblemDocument {
  title?: string;
  code?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

export async function toApiError(response: Response): Promise<ApiError> {
  let body: ProblemDocument = {};
  try {
    body = (await response.json()) as ProblemDocument;
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
