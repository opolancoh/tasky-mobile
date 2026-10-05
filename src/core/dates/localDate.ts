import type { LocalDate, LocalTime } from '../types';

/** Building an Intl.DateTimeFormat costs milliseconds in Hermes: reuse one per locale and options (docs/performance.md). */
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = formatters.get(key);
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat(locale, options)));
  return f;
}

/** Today in an IANA time zone (the profile's, not the device's), e.g. "2026-09-28". */
export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  return nowIn(timeZone, now).date;
}

/**
 * Not for display: the locale used to read a date's numbers out of Intl. 'en-CA' gives Latin digits,
 * two-digit months and days, and a 24-hour clock (with hourCycle 'h23'); parts are read by type, not position.
 */
const PARTS_LOCALE = 'en-CA';

/** The date and wall-clock time in an IANA time zone, e.g. { date: "2026-09-28", time: "17:05" }. */
export function nowIn(timeZone: string, now: Date = new Date()): { date: LocalDate; time: LocalTime } {
  const parts = formatter(PARTS_LOCALE, {
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
  return formatter(locale, { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

/** Formats a LocalTime ("18:00") the locale's way: "6:00 PM" in English, "18:00" in Spanish. */
export function formatLocalTime(time: LocalTime, locale: string): string {
  const [h, m] = time.split(':').map(Number);
  return formatter(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
}

/**
 * Formats a UTC instant ("2026-09-20T14:14:00Z") in an IANA time zone (the profile's), e.g. options
 * { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } → "9:14 AM GMT-5".
 */
export function formatInstant(iso: string, locale: string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return formatter(locale, { ...options, timeZone }).format(new Date(iso));
}
