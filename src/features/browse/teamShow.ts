import { addDays } from '@/core/dates/localDate';
import type { LocalDate } from '@/core/types';
import type { TaskFilter } from '@/data/tasks/types';

/** What a team's card opens (M144): the same filters `GET /teams/{id}/summary` counts by (D123). */
export const teamShows = ['late', 'thisWeek', 'unassigned', 'yours'] as const;
export type TeamShow = (typeof teamShows)[number];

export function teamShowFilter(show: TeamShow, today: LocalDate): TaskFilter {
  switch (show) {
    case 'late': return { due: ['overdue'] };
    case 'thisWeek': return { dueFrom: today, dueTo: addDays(today, 6) };
    case 'unassigned': return { assignee: 'none' };
    case 'yours': return { assignee: 'me' };
  }
}
