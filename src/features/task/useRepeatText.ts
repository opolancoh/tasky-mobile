import { useTranslation } from 'react-i18next';

import { addDays, formatLocalDate, weekday } from '@/core/dates/localDate';
import type { LocalDate } from '@/core/types';
import type { DayOfWeek, Repeat, RepeatPattern } from '@/data/tasks/types';

export const DAYS: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
/** A Sunday: day names come from Intl (in the app's language) for SUNDAY + n. */
const SUNDAY: LocalDate = '2026-10-04';

/**
 * How a repeat reads: "Weekly on Monday", "Every 2 weeks on Mon, Thu", "Monthly on day 28", plus
 * ", after completion" for rules that count from completion. Formatters are cached in core/dates.
 */
export function useRepeatText() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const dayName = (day: number, width: 'long' | 'short') => formatLocalDate(addDays(SUNDAY, day), locale, { weekday: width });
  const monthDay = (date: LocalDate) => formatLocalDate(date, locale, { month: 'short', day: 'numeric' });

  /** A plain rule on `due` (interval 1, from the due date): the Repeat picker's options. */
  const option = (pattern: RepeatPattern, due: LocalDate) =>
    pattern === 'weekly' ? t('repeat.weekly', { day: dayName(weekday(due), 'long') })
    : pattern === 'monthly' ? t('repeat.monthly', { day: Number(due.slice(8)) })
    : pattern === 'yearly' ? t('repeat.yearly', { date: monthDay(due) })
    : t(`repeat.${pattern}`);

  const describe = (repeat: Repeat, due: LocalDate | null | undefined) => {
    const on = due ?? SUNDAY;
    const n = repeat.interval;
    const days = repeat.daysOfWeek?.length ? repeat.daysOfWeek.map((d) => DAYS.indexOf(d)) : [weekday(on)];
    const dayOfMonth = repeat.dayOfMonth ?? Number(on.slice(8));
    const rule =
      repeat.pattern === 'weekdays' ? t('repeat.weekdays')
      : repeat.pattern === 'daily' ? (n > 1 ? t('repeat.everyDays', { count: n }) : t('repeat.daily'))
      : repeat.pattern === 'weekly'
        ? n > 1 || days.length > 1
          ? t('repeat.everyWeeks', { count: n, days: days.map((d) => dayName(d, 'short')).join(', ') })
          : t('repeat.weekly', { day: dayName(days[0]!, 'long') })
      : repeat.pattern === 'monthly' ? (n > 1 ? t('repeat.everyMonths', { count: n, day: dayOfMonth }) : t('repeat.monthly', { day: dayOfMonth }))
      : n > 1 ? t('repeat.everyYears', { count: n, date: monthDay(on) }) : t('repeat.yearly', { date: monthDay(on) });
    return repeat.mode === 'fromCompletion' ? t('repeat.fromCompletion', { rule }) : rule;
  };

  return { option, describe };
}
