/** Requests at a time for work on many tasks (M81, M118). */
const AT_ONCE = 4;

/** Runs `work` on every item, `AT_ONCE` at a time. */
export async function pool<T>(items: T[], work: (item: T) => Promise<void>) {
  let next = 0;
  const lane = async () => {
    while (next < items.length) await work(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(AT_ONCE, items.length) }, lane));
}
