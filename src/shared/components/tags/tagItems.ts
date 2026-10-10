import { collator } from '@/core/text/collate';
import type { Tag } from '@/data/tasks/types';

/** A tag as pickers show it: one of the caller's tags, or a picked name they don't have yet (new). */
export interface TagItem {
  name: string;
  color: string | null;
}

/** Last used first (most recent at the front of `recent`), then the rest A–Z. Names in lower case. */
export function sortByRecent(tags: Tag[], recent: string[]): TagItem[] {
  const rank = (name: string) => {
    const i = recent.indexOf(name);
    return i < 0 ? Infinity : i;
  };
  return tags
    .map((g) => ({ name: g.name.toLowerCase(), color: g.color }))
    .sort((a, b) => rank(a.name) - rank(b.name) || collator.compare(a.name, b.name));
}
