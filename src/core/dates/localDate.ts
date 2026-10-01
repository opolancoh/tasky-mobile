import type { LocalDate, LocalTime } from '../types';

/** Today in an IANA time zone (the profile's, not the device's), e.g. "2026-09-28". */
export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  return nowIn(timeZone, now).date;
}

/** The date and wall-clock time in an IANA time zone, e.g. { date: "2026-09-28", time: "17:05" }. */
export function nowIn(timeZone: string, now: Date = new Date()): { date: LocalDate; time: LocalTime } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/** A LocalDate n days later (or earlier, with a negative n). */
export function addDays(date: LocalDate, n: number): LocalDate {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (date: LocalDate): number => new Date(`${date}T12:00:00Z`).getUTCDay();

/** The next `day` (0 = Sunday … 6 = Saturday) after `date`; a week later when `date` already is one. */
export function nextWeekday(date: LocalDate, day: number): LocalDate {
  return addDays(date, ((day - weekday(date) + 7) % 7) || 7);
}

/** The next Monday after `date`: "next week". */
export const nextMonday = (date: LocalDate): LocalDate => nextWeekday(date, 1);

/** Formats a LocalDate for display, e.g. "Monday, September 28". Noon UTC keeps the day in every zone. */
export function formatLocalDate(date: LocalDate, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

/** Formats a LocalTime ("18:00") the locale's way: "6:00 PM" in English, "18:00" in Spanish. */
export function formatLocalTime(time: LocalTime, locale: string): string {
  const [h, m] = time.split(':').map(Number);
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
}
