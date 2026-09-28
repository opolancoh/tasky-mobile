import type { LocalDate } from '../types';

/** Today in an IANA time zone (the profile's, not the device's), e.g. "2026-09-28". */
export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Formats a LocalDate for display, e.g. "Monday, September 28". Noon UTC keeps the day in every zone. */
export function formatLocalDate(date: LocalDate, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
