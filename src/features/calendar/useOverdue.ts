import { useTaskPages } from '@/data/tasks/queries';

const PAGE = 50;

/** Overdue tasks (M72), soonest first, a page at a time (`?due=overdue`): the chip's count and its tasks when open. */
export function useOverdue() {
  const pages = useTaskPages({ due: ['overdue'], sort: 'due', limit: PAGE });
  return {
    pages,
    count: pages.data?.pages[0]?.total ?? 0,
    tasks: pages.data?.pages.flatMap((p) => p.items) ?? [],
  };
}
