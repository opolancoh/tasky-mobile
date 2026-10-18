import { useTranslation } from 'react-i18next';

import { dayOfMonth, monthOf } from '@/core/dates/calendar';
import { addDays, formatLocalDate } from '@/core/dates/localDate';
import type { LocalDate } from '@/core/types';

/** "octubre" → "Octubre": names used as headings. */
const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** How the Calendar tab names months, weeks and days (M72), in the app's language. Formatters are cached in core/dates. */
export function useCalendarLabels(today: LocalDate | undefined) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const short = (date: LocalDate) => formatLocalDate(date, locale, { month: 'short', day: 'numeric' });
  const long = (date: LocalDate) => formatLocalDate(date, locale, { weekday: 'long', month: 'short', day: 'numeric' });
  return {
    /** "October", with the year only when it isn't this year: "January 2027". */
    month: (date: LocalDate) =>
      upper(formatLocalDate(date, locale, today && date.slice(0, 4) === today.slice(0, 4) ? { month: 'long' } : { month: 'long', year: 'numeric' })),
    /** "Oct 5 – 11", or "Sep 28 – Oct 4" across two months. */
    week: (monday: LocalDate) => {
      const sunday = addDays(monday, 6);
      return monthOf(monday) === monthOf(sunday)
        ? t('calendar.week.same', { month: formatLocalDate(monday, locale, { month: 'short' }), start: dayOfMonth(monday), end: dayOfMonth(sunday) })
        : t('calendar.week.across', { start: short(monday), end: short(sunday) });
    },
    /** A day's tasks heading: "Today · Saturday, Oct 17", "Tomorrow · …" or "Monday, Oct 19". */
    day: (date: LocalDate) =>
      date === today ? t('calendar.dayToday', { date: long(date) })
      : today && date === addDays(today, 1) ? t('calendar.dayTomorrow', { date: long(date) })
      : upper(long(date)),
    /** "Saturday". */
    weekday: (date: LocalDate) => upper(formatLocalDate(date, locale, { weekday: 'long' })),
    /** Under the weekday in List: "Today", "Tomorrow" or the month. */
    under: (date: LocalDate) =>
      date === today ? t('dates.today') : today && date === addDays(today, 1) ? t('dates.tomorrow') : upper(formatLocalDate(date, locale, { month: 'long' })),
  };
}
