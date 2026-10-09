/**
 * The API's tag rule (TagNames.cs; change both together): a name is 1–30 letters, digits, _ or -, saved lower case.
 * Titles are plain text: `#name` in a title is not a tag (D60, M31).
 */
const NAME = '[\\p{L}\\p{M}\\p{N}_-]';
export const TAG_NAME_MAX = 30;
const VALID_NAME = new RegExp(`^${NAME}{1,${TAG_NAME_MAX}}$`, 'u');
/** Characters a tag name can't hold, removed as the person types. */
export const stripInvalidTagChars = (text: string) => text.replace(new RegExp(`[^\\p{L}\\p{M}\\p{N}_-]`, 'gu'), '');

/** What a search box holds as a new tag's name: without a leading #, lower case; undefined when the API would refuse it. */
export function newTagName(query: string): string | undefined {
  const name = query.trim().replace(/^#/, '').toLowerCase();
  return VALID_NAME.test(name) ? name : undefined;
}
