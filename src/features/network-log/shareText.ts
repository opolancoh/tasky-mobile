import { Platform } from 'react-native';

import type { Me } from '@/data/tenancy/types';
import type { NetworkEntry } from '@/shared/network/networkLog';

import { sizeLabel, statusLabel } from './statusTone';

/** What support needs to place a shared call: app, server, device, user. */
export interface SessionInfo {
  app: string;
  server: string;
  language: string;
  me?: Me;
}

export const headersText = (headers?: Record<string, string>) =>
  headers && Object.keys(headers).length ? Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n') : undefined;

function sessionLines({ app, server, language, me }: SessionInfo): string[] {
  return [
    `App: ${app} · ${Platform.OS} ${Platform.Version}`,
    `Server: ${server}`,
    `User: ${me ? `${me.email} · ${me.platformRole ?? 'user'}` : '—'}`,
    `Language: ${language}${me ? ` · ${me.timeZone}` : ''}`,
  ];
}

/** "96 ms · 1.2 KB · retry 1/3" */
export const timingLine = (e: NetworkEntry) =>
  [e.ms === undefined ? null : `${e.ms} ms`, e.size === undefined ? null : sizeLabel(e.size), ...e.notes].filter((x) => x !== null).join(' · ');

/** "200 · 96 ms · 1.2 KB · retry 1/3" */
const metaLine = (e: NetworkEntry) => [statusLabel(e), timingLine(e)].filter(Boolean).join(' · ');

function entryLines(e: NetworkEntry): string[] {
  return [
    `#${e.id} ${e.method} ${e.url}`,
    `${e.startedAt} · ${metaLine(e)}`,
    `Access token: ${e.tokenSent ? 'sent' : 'not sent'}${e.traceId ? ` · traceId ${e.traceId}` : ''}`,
    '',
    '— Request headers —',
    headersText(e.requestHeaders) ?? '(none)',
    '— Request body —',
    e.requestBody ?? '(none)',
    '— Response headers —',
    headersText(e.responseHeaders) ?? '(none)',
    '— Response body —',
    e.responseBody ?? '(none)',
  ];
}

/** One call, everything about it, for Share. */
export const entryText = (e: NetworkEntry, session: SessionInfo) => [...sessionLines(session), '', ...entryLines(e)].join('\n');

/** One section of a call, for its Share (M91): a line to find the call, then the section. */
export const sectionText = (e: NetworkEntry, section: string, text: string) =>
  [`#${e.id} ${e.method} ${e.path} · ${statusLabel(e)}${e.traceId ? ` · traceId ${e.traceId}` : ''}`, `— ${section} —`, text].join('\n');

/** The log for Share: one line per call, then everything about the failed ones. */
export function logText(entries: NetworkEntry[], session: SessionInfo): string {
  const failed = entries.filter((e) => e.errorCode);
  return [
    ...sessionLines(session),
    '',
    ...entries.map((e) => `#${e.id} ${e.startedAt} ${e.method} ${e.path} · ${metaLine(e)}`),
    ...failed.flatMap((e) => ['', '════════', ...entryLines(e)]),
  ].join('\n');
}

const quote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** The call as curl, for Postman or a terminal; the token is a placeholder, masked values stay "***". */
export function curlOf(e: NetworkEntry): string {
  const parts = [`curl -X ${e.method} ${quote(e.url)}`];
  for (const [k, v] of Object.entries(e.requestHeaders)) parts.push(`-H ${quote(k.toLowerCase() === 'authorization' ? `${k}: Bearer <token>` : `${k}: ${v}`)}`);
  if (e.requestBody) {
    let body = e.requestBody;
    try {
      body = JSON.stringify(JSON.parse(body));
    } catch {
      // cut at 8 KB: send it as shown
    }
    parts.push(`--data ${quote(body)}`);
  }
  return parts.join(' \\\n  ');
}
