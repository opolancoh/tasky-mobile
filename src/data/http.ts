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

/** A keyset page (D75): `nextCursor` is null on the last page. Every list endpoint answers with one (D76). */
export type Page<T> = { items: T[]; nextCursor: string | null };

type Query = Record<string, string | number | boolean | undefined>;

/** Every page of a list a screen needs whole (Browse, pickers, people, invitations), following `nextCursor` (D76). */
export async function getAll<T>(path: string, query?: Query): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await http().get<Page<T>>(path, { query: { ...query, limit: 200, cursor } });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return items;
}
