import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { addDays, formatLocalDate, nextMonday } from '@/core/dates/localDate';
import type { LocalDate } from '@/core/types';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { DateWheel, ListRow, Text } from '@/shared/ui';

interface DueDatePickerProps {
  value: LocalDate | undefined;
  /** The profile's today: the quick choices and the earliest date on the wheel. */
  today: LocalDate;
  /** A quick choice or No date: sets it and goes back (M21). */
  onPick(date: LocalDate | undefined): void;
  /** The wheel, as it turns; kept only when the caller confirms (‹ Task, Done). */
  onChange(date: LocalDate): void;
}

/** Picks a due date (Quick add, task detail): Today, Tomorrow, Next week, a custom date on the wheel, No date. */
export function DueDatePicker({ value, today, onPick, onChange }: DueDatePickerProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const labels = useDateLabels(today);
  const [custom, setCustom] = useState(false);

  return (
    <ScrollView bounces={false}>
      {[
        { label: t('dueDate.today'), date: today },
        { label: t('dueDate.tomorrow'), date: addDays(today, 1) },
        { label: t('dueDate.nextWeek'), date: nextMonday(today) },
      ].map(({ label, date }) => (
        <ListRow
          key={label}
          label={label}
          value={formatLocalDate(date, locale, { weekday: 'short', month: 'short', day: 'numeric' })}
          selected={value === date}
          onPress={() => onPick(date)}
        />
      ))}
      <ListRow
        label={t('dueDate.custom')}
        value={custom && value ? <Text variant="body" color="accent">{labels.day(value)}</Text> : undefined}
        onPress={() => {
          setCustom((c) => !c);
          if (!value) onChange(today);
        }}
        divider={!custom}
      />
      {custom && value && (
        <DateWheel
          value={value}
          onChange={(date) => onChange(date < today ? today : date)}
          locale={locale}
          fromYear={Number(today.slice(0, 4))}
          labels={{ day: t('wheels.day'), month: t('wheels.month'), year: t('wheels.year') }}
        />
      )}
      <ListRow label={t('dueDate.none')} selected={!value} onPress={() => onPick(undefined)} divider={false} />
    </ScrollView>
  );
}
