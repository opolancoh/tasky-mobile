import { useTranslation } from 'react-i18next';

import { addDays, formatLocalDate, formatLocalTime } from '@/core/dates/localDate';
import type { ReminderAt } from '@/core/dates/reminders';
import type { LocalDate } from '@/core/types';

/**
 * How dates read in the app's language, relative to `today` (the profile's): "Today", "Tomorrow" or
 * "Wed, Oct 7" ("Fri, Apr 6, 2029" outside this year); a reminder as "Wed, 9:00 AM"; a time as "9:00 AM". Formatters are cached in core/dates (docs/performance.md).
 */
export function useDateLabels(today: LocalDate | undefined) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  return {
    day: (date: LocalDate) =>
      date === today ? t('dates.today')
      : today && date === addDays(today, 1) ? t('dates.tomorrow')
      : today && date.slice(0, 4) !== today.slice(0, 4)
        ? formatLocalDate(date, locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : formatLocalDate(date, locale, { weekday: 'short', month: 'short', day: 'numeric' }),
    reminder: (r: ReminderAt) => `${formatLocalDate(r.date, locale, { weekday: 'short' })}, ${formatLocalTime(r.time, locale)}`,
    time: (time: string) => formatLocalTime(time, locale),
  };
}
