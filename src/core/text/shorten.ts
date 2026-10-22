/**
 * An email that fits `max` characters: cut in the middle so the domain stays ("lkkjsjd…@email.com"); one longer than
 * `max` without a domain to keep is cut at the end.
 */
export function shortenEmail(email: string, max: number): string {
  if (email.length <= max) return email;
  const at = email.lastIndexOf('@');
  const domain = at > 0 ? email.slice(at) : '';
  const keep = max - domain.length - 1;
  return domain && keep >= 4 ? `${email.slice(0, keep)}…${domain}` : `${email.slice(0, max - 1)}…`;
}
