/**
 * The API's tag rule (TagNames.cs; change both together): a name is 1–30 letters, digits, _ or -.
 * In a title, a # at the start or after a space, then the name up to the next space.
 */
const NAME = '[\\p{L}\\p{M}\\p{N}_-]';
export const TAG_NAME_MAX = 30;
export const TAG = new RegExp(`(?<=^|\\s)#(${NAME}{1,${TAG_NAME_MAX}})(?=\\s|$)`, 'gu');
const VALID_NAME = new RegExp(`^${NAME}{1,${TAG_NAME_MAX}}$`, 'u');
/** Characters a tag name can't hold, removed as the person types. */
export const stripInvalidTagChars = (text: string) => text.replace(new RegExp(`[^\\p{L}\\p{M}\\p{N}_-]`, 'gu'), '');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The #tags typed in a title, lower case. */
export const typedTags = (title: string) => [...title.matchAll(TAG)].map((m) => m[1]!.toLowerCase());

/** The title without one typed #tag (case-insensitive), spaces tidied. */
export const removeTypedTag = (title: string, name: string) =>
  title.replace(new RegExp(`(^|\\s)#${escapeRegExp(name)}(?=\\s|$)`, 'i'), '$1').replace(/\s+/g, ' ').trim();

/** What a search box holds as a new tag's name: without a leading #, lower case; undefined when the API would refuse it. */
export function newTagName(query: string): string | undefined {
  const name = query.trim().replace(/^#/, '').toLowerCase();
  return VALID_NAME.test(name) ? name : undefined;
}
