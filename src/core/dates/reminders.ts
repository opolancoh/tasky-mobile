import type { LocalDate, LocalTime } from '../types';

import { addDays, nextMonday, nextWeekday, weekday } from './localDate';

/** The caller's reminder on a task: a local date and time, fired wherever the person is. */
export interface ReminderAt {
  date: LocalDate;
  time: LocalTime;
}

/** What the form holds: the reminder the person chose, or null for none. A due date doesn't set one (M19, D110). */
export type ReminderChoice = ReminderAt | null;

const MORNING: LocalTime = '09:00';
const EVENING: LocalTime = '18:00';
const NIGHT: LocalTime = '21:00';

/** The first quarter hour after `now` (15:10 → 15:15, 15:15 → 15:30; tomorrow 00:00 late at night): the earliest reminder the pickers offer. */
export function earliestReminder(now: { date: LocalDate; time: LocalTime }): ReminderAt {
  const [h, m] = now.time.split(':').map(Number) as [number, number];
  const next = (Math.floor((h * 60 + m) / 15) + 1) * 15;
  if (next >= 24 * 60) return { date: addDays(now.date, 1), time: '00:00' };
  return { date: now.date, time: `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}` };
}

export const sameReminder = (a: ReminderAt | null, b: ReminderAt | null) => !!a && !!b && a.date === b.date && a.time === b.time;

export type PresetId = 'onDueDate' | 'laterToday' | 'tomorrow' | 'thisWeekend' | 'nextWeek';

/**
 * A task's quick choices, from "now" in the profile's time zone (M114): On its due date at 9:00 while that's still ahead (no
 * automatic reminder since D110), Later today (18:00) until 17:00, so it's never less than an hour away, Tomorrow, This
 * weekend (the coming Saturday, Monday to Friday only) and Next week (the coming Monday).
 */
export function reminderPresets(now: { date: LocalDate; time: LocalTime }, due?: LocalDate | null): { id: PresetId; at: ReminderAt }[] {
  const presets: { id: PresetId; at: ReminderAt }[] = [];
  if (due && (due > now.date || (due === now.date && now.time < MORNING))) presets.push({ id: 'onDueDate', at: { date: due, time: MORNING } });
  if (now.time < '17:00') presets.push({ id: 'laterToday', at: { date: now.date, time: EVENING } });
  presets.push({ id: 'tomorrow', at: { date: addDays(now.date, 1), time: MORNING } }, ...later(now));
  return presets;
}

/** This weekend on weekdays, then Next week: the far choices both lists end with. */
function later(now: { date: LocalDate; time: LocalTime }): { id: 'thisWeekend' | 'nextWeek'; at: ReminderAt }[] {
  const day = weekday(now.date);
  return [
    ...(day >= 1 && day <= 5 ? [{ id: 'thisWeekend' as const, at: { date: nextWeekday(now.date, 6), time: MORNING } }] : []),
    { id: 'nextWeek' as const, at: { date: nextMonday(now.date), time: MORNING } },
  ];
}

/** `now` plus `minutes`, rounded up to the next 5 minutes (15:07 + 60 → 16:10), past midnight onto the next day. */
export function laterBy(now: { date: LocalDate; time: LocalTime }, minutes: number): ReminderAt {
  const [h, m] = now.time.split(':').map(Number) as [number, number];
  const total = Math.ceil((h * 60 + m + minutes) / 5) * 5;
  const days = Math.floor(total / (24 * 60)), left = total % (24 * 60);
  return { date: addDays(now.date, days), time: `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}` };
}

export type QuickReminderId = 'inAnHour' | 'thisEvening' | 'tonight' | 'tomorrow' | 'thisWeekend' | 'nextWeek';

/**
 * A reminder's choices (M114): In 1 hour, This evening at 18:00 until 17:00 or Tonight at 21:00 until 20:00, Tomorrow,
 * then This weekend (Monday to Friday) and Next week. The form's chips are the first three (`chips`).
 */
export function quickReminders(now: { date: LocalDate; time: LocalTime }, chips = false): { id: QuickReminderId; at: ReminderAt }[] {
  const near: { id: QuickReminderId; at: ReminderAt }[] = [
    { id: 'inAnHour', at: laterBy(now, 60) },
    ...(now.time < '17:00' ? [{ id: 'thisEvening' as const, at: { date: now.date, time: EVENING } }]
      : now.time < '20:00' ? [{ id: 'tonight' as const, at: { date: now.date, time: NIGHT } }] : []),
    { id: 'tomorrow', at: { date: addDays(now.date, 1), time: MORNING } },
  ];
  return chips ? near : [...near, ...later(now)];
}

export type SnoozeId = 'tenMinutes' | 'oneHour' | 'tomorrow';

/** Snooze's choices (M114), from a banner or a row: the local "until" each one sends. */
export function snoozeUntil(id: SnoozeId, now: { date: LocalDate; time: LocalTime }): string {
  const at = id === 'tenMinutes' ? laterBy(now, 10) : id === 'oneHour' ? laterBy(now, 60) : { date: addDays(now.date, 1), time: MORNING };
  return `${at.date}T${at.time}:00`;
}
