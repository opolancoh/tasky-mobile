import type { Comment, UserRef } from '@/data/tasks/types';

/** `@{userId}` in a comment's body (D92). */
const TOKEN = /@\{([0-9a-fA-F-]{36})\}/g;

/** A body in pieces: plain text, and each mention as "@Name". */
export function mentionParts(c: Pick<Comment, 'body' | 'mentions'>): { text: string; mention: boolean }[] {
  const names = new Map(c.mentions.map((m) => [m.id.toLowerCase(), m.displayName]));
  const parts: { text: string; mention: boolean }[] = [];
  let last = 0;
  for (const m of c.body.matchAll(TOKEN)) {
    if (m.index > last) parts.push({ text: c.body.slice(last, m.index), mention: false });
    const name = names.get(m[1].toLowerCase());
    parts.push(name ? { text: `@${name}`, mention: true } : { text: '@', mention: false });
    last = m.index + m[0].length;
  }
  if (last < c.body.length) parts.push({ text: c.body.slice(last), mention: false });
  return parts;
}

/** The body as people read it ("@Luis do we…"): copying, screen readers, editing. */
export const plainText = (c: Pick<Comment, 'body' | 'mentions'>) => mentionParts(c).map((p) => p.text).join('');

/**
 * The typed text with each picked person's "@Name" as their `@{userId}` token, longest names first (so "@Ana María"
 * wins over "@Ana"). Someone typed by hand without picking stays plain text.
 */
export function toBody(text: string, picked: UserRef[]) {
  let body = text.trim();
  [...picked].sort((a, b) => b.displayName.length - a.displayName.length).forEach((p) => {
    body = body.split(`@${p.displayName}`).join(`@{${p.id}}`);
  });
  return body;
}

/** The "@query" being typed at the end of the text, or null when the last word isn't a mention. */
export function typedMention(text: string): string | null {
  const m = /(?:^|\s)@([^\s@]*)$/u.exec(text);
  return m ? m[1] : null;
}
