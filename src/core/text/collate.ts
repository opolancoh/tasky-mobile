/**
 * One collator for the whole app: sorting by name never builds Intl objects or calls `localeCompare` in render or in a
 * loop (docs/performance.md).
 */
export const collator = new Intl.Collator();

/** Sorts things by `name`, A–Z in the device's language. */
export const byName = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name);
