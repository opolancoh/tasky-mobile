import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { weekday } from '@/core/dates/localDate';
import type { LocalDate } from '@/core/types';
import type { Repeat, RepeatPattern } from '@/data/tasks/types';
import { ListRow, Text, useTheme } from '@/shared/ui';

import { DAYS, useRepeatText } from '../useRepeatText';

const PATTERNS: RepeatPattern[] = ['daily', 'weekdays', 'weekly', 'monthly', 'yearly'];

/** Is `repeat` the plain rule the picker offers for `pattern` (every 1, from the due date, on the due date's day)? */
function isPlain(repeat: Repeat | null | undefined, pattern: RepeatPattern, due: LocalDate): boolean {
  if (!repeat || repeat.pattern !== pattern || repeat.interval !== 1 || repeat.mode !== 'fromDueDate') return false;
  if (pattern === 'weekly') return !repeat.daysOfWeek?.length || (repeat.daysOfWeek.length === 1 && repeat.daysOfWeek[0] === DAYS[weekday(due)]);
  return true;
}

/**
 * Task detail's Repeat page (M25): Never, then Daily, Weekdays, Weekly, Monthly, Yearly on the due date (today
 * when there is none). A tap applies and closes. A custom rule the task already has is listed first, checked.
 */
export function RepeatPicker({ value, due, onPick }: { value: Repeat | null | undefined; due: LocalDate; onPick(pattern: RepeatPattern | null): void }) {
  const { t } = useTranslation();
  const { space } = useTheme();
  const { option, describe } = useRepeatText();
  const custom = value && !PATTERNS.some((p) => isPlain(value, p, due));

  return (
    <ScrollView bounces={false}>
      {custom && <ListRow label={describe(value, due)} selected />}
      <ListRow label={t('repeat.never')} selected={!value} onPress={() => onPick(null)} />
      {PATTERNS.map((p, i) => (
        <ListRow key={p} label={option(p, due)} selected={isPlain(value, p, due)} onPress={() => onPick(p)} divider={i < PATTERNS.length - 1} />
      ))}
      <Text variant="footnote" color="ink3" style={{ marginTop: space.lg }}>
        {t('repeat.hint')}
      </Text>
    </ScrollView>
  );
}
