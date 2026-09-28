import type { HttpClient } from '@/core/http/client';

let client: HttpClient | undefined;

/** Called once at startup (src/app/services.ts) with the configured client. */
export function configureHttp(c: HttpClient): void {
  client = c;
}

/** The API client every `data/*` module calls. */
export function http(): HttpClient {
  if (!client) throw new Error('configureHttp() has not been called');
  return client;
}
