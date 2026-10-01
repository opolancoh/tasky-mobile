import type { Tag } from '@/data/tasks/types';

/** The API's #tag rule (TagNames.cs): a # at the start or after a space, then up to 50 characters without spaces or #. */
export const TAG = /(?<=^|\s)#([^\s#]{1,50})(?=\s|$)/g;
const VALID_NAME = /^[^\s#]{1,50}$/;
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

/** Tags the page shows: the workspace's, plus picked names the workspace doesn't have yet (new ones). */
export interface TagItem {
  name: string;
  color: string | null;
}

/** Last used first (most recent at the front of `recent`), then the rest A–Z. */
export function sortByRecent(tags: Tag[], recent: string[]): TagItem[] {
  const rank = (name: string) => {
    const i = recent.indexOf(name);
    return i < 0 ? Infinity : i;
  };
  return tags
    .map((g) => ({ name: g.name.toLowerCase(), color: g.color }))
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}
