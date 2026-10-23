import { useTaskPages, useTasks } from '@/data/tasks/queries';

const PAGE = 50;

/**
 * Overdue tasks (M72), soonest first (`?due=overdue`): the chip's count always (`limit=1`, the total only), its tasks a page
 * at a time only once the chip is open (`open`), then cached.
 */
export function useOverdue(open: boolean) {
  const total = useTasks({ due: ['overdue'], limit: 1 });
  const pages = useTaskPages({ due: ['overdue'], sort: 'due', limit: PAGE }, open);
  return {
    pages,
    count: total.data?.total ?? 0,
    tasks: pages.data?.pages.flatMap((p) => p.items) ?? [],
    /** Pull to refresh: the count, and the tasks when they are shown. */
    refetch: () => Promise.all([total.refetch(), open ? pages.refetch() : undefined]),
  };
}
