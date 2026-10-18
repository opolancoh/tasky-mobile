import { useHomeSection, useTaskPages } from '@/data/tasks/queries';

/** What a day can't show (M72): overdue tasks (`?due=overdue`, soonest first) and tasks with no date (GET /home/inbox). */
export type OffDay = 'overdue' | 'none';

const PAGE = 50;

/** Overdue and No date, a page at a time: their counts for the chips and their tasks when one is open. */
export function useOffCalendar() {
  const overdue = useTaskPages({ due: ['overdue'], sort: 'due', limit: PAGE });
  const none = useHomeSection('inbox');
  const of = (kind: OffDay) => (kind === 'overdue' ? overdue : none);
  return {
    count: (kind: OffDay) => of(kind).data?.pages[0]?.total ?? 0,
    tasks: (kind: OffDay) => of(kind).data?.pages.flatMap((p) => p.items) ?? [],
    query: of,
    refetch: () => Promise.all([overdue.refetch(), none.refetch()]),
  };
}
