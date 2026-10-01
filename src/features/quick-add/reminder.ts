import { addDays, nextMonday, nextWeekday } from '@/core/dates/localDate';
import type { LocalDate, LocalTime } from '@/core/types';

/** The caller's reminder on a task: a local date and time, fired wherever the person is. */
export interface ReminderAt {
  date: LocalDate;
  time: LocalTime;
}

/**
 * What the form holds:
 * - 'auto': nothing chosen; with a due date the API adds 9:00 on that day (D31), without one there's none
 * - a date and time: chosen by the person
 * - null: removed; with a due date the app deletes the automatic one right after creating the task
 */
export type ReminderChoice = ReminderAt | 'auto' | null;

export const AUTO_TIME: LocalTime = '09:00';
const MORNING: LocalTime = '09:00';
const EVENING: LocalTime = '18:00';

/** The reminder the task will actually have. */
export function effectiveReminder(choice: ReminderChoice, dueDate: LocalDate | undefined): ReminderAt | null {
  if (choice === 'auto') return dueDate ? { date: dueDate, time: AUTO_TIME } : null;
  return choice;
}

export const sameReminder = (a: ReminderAt | null, b: ReminderAt | null) => !!a && !!b && a.date === b.date && a.time === b.time;

export type PresetId = 'laterToday' | 'tomorrow' | 'thisWeekend' | 'nextWeek';

/**
 * The quick choices, from "now" in the profile's time zone. Later today (18:00) is offered only until
 * 17:00, so it's never less than an hour away. This weekend is the coming Saturday (next week's on a
 * weekend). Next week is the coming Monday.
 */
export function reminderPresets(now: { date: LocalDate; time: LocalTime }): { id: PresetId; at: ReminderAt }[] {
  const presets: { id: PresetId; at: ReminderAt }[] = [];
  if (now.time < '17:00') presets.push({ id: 'laterToday', at: { date: now.date, time: EVENING } });
  presets.push(
    { id: 'tomorrow', at: { date: addDays(now.date, 1), time: MORNING } },
    { id: 'thisWeekend', at: { date: nextWeekday(now.date, 6), time: MORNING } },
    { id: 'nextWeek', at: { date: nextMonday(now.date), time: MORNING } },
  );
  return presets;
}
