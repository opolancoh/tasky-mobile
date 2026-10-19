/**
 * Links into the app (D95): a team's invite link (`/join/{code}`) or an invitation email's (`/i/{token}`), as
 * `azignia://join/…`, `https://<host>/join/…`, or the bare code someone pasted. Null when it's neither.
 */
export interface JoinLink {
  kind: 'team' | 'invitation';
  code: string;
}

const PATH = /(?:^|\/)(join|i)\/([A-Za-z0-9_-]{16,64})(?:[/?#]|$)/;

export function parseJoinLink(text: string): JoinLink | null {
  const value = text.trim();
  const path = PATH.exec(value);
  if (path) return { kind: path[1] === 'join' ? 'team' : 'invitation', code: path[2] };
  // A bare code: a team's is 22 characters (128 bits), an invitation's 43 (256 bits).
  if (/^[A-Za-z0-9_-]{22}$/.test(value)) return { kind: 'team', code: value };
  if (/^[A-Za-z0-9_-]{43}$/.test(value)) return { kind: 'invitation', code: value };
  return null;
}
