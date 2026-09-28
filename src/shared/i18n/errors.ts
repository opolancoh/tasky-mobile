import { isApiError } from '@/core/http/problem';

import i18n from './i18n';

/**
 * The message for an error, from `errors.<code>` in the translation files (never the API's `title`).
 * Unknown codes fall back to a generic message.
 */
export function errorMessage(error: unknown): string {
  const messages = i18n.t('errors', { returnObjects: true }) as Record<string, string>;
  const code = isApiError(error) ? error.code : 'unknown';
  return messages[code] ?? messages.unknown!;
}

/** First message per field of a validation problem, e.g. { email: "…" }. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || error.status !== 400) return {};
  return Object.fromEntries(
    Object.entries(error.errors)
      .filter(([, messages]) => messages.length > 0)
      .map(([field, messages]) => [field, messages[0]!]),
  );
}
