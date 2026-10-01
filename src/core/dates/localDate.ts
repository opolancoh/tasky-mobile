import type { LocalDate } from '../types';

/** Today in an IANA time zone (the profile's, not the device's), e.g. "2026-09-28". */
export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** A LocalDate n days later (or earlier, with a negative n). */
export function addDays(date: LocalDate, n: number): LocalDate {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The next Monday after `date` (a week later when `date` is a Monday): "next week". */
export function nextMonday(date: LocalDate): LocalDate {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();   // 0 = Sunday
  return addDays(date, ((8 - day) % 7) || 7);
}

/** Formats a LocalDate for display, e.g. "Monday, September 28". Noon UTC keeps the day in every zone. */
export function formatLocalDate(date: LocalDate, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
