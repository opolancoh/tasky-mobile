import type { LocalDate } from '../types';

import { addDays, weekday } from './localDate';

/** The Monday of `date`'s week: weeks start on Monday (M72). */
export const weekStart = (date: LocalDate): LocalDate => addDays(date, -((weekday(date) + 6) % 7));

/** "2026-10" of a LocalDate. */
export const monthOf = (date: LocalDate): string => date.slice(0, 7);

/** The first day of `date`'s month. */
export const monthStart = (date: LocalDate): LocalDate => `${monthOf(date)}-01`;

/** The last day of `date`'s month. */
export function monthEnd(date: LocalDate): LocalDate {
  const d = new Date(`${monthStart(date)}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}

/** The first day of the month n months after (or before) `date`'s. */
export function addMonths(date: LocalDate, n: number): LocalDate {
  const d = new Date(`${monthStart(date)}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** The Mondays of the weeks that hold `date`'s month, first to last (4 to 6). */
export function monthWeeks(date: LocalDate): LocalDate[] {
  const month = monthOf(date), weeks: LocalDate[] = [];
  for (let w = weekStart(monthStart(date)); monthOf(w) <= month; w = addDays(w, 7)) weeks.push(w);
  return weeks;
}

/** The day of the month, 1–31. */
export const dayOfMonth = (date: LocalDate): number => Number(date.slice(8, 10));
