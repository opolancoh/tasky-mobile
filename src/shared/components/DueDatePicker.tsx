import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { addDays, formatLocalDate, nextMonday } from '@/core/dates/localDate';
import type { LocalDate } from '@/core/types';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { DateWheel, DockedAction, ListRow, SectionLabel, Text, useTheme } from '@/shared/ui';

interface DueDatePickerProps {
  value: LocalDate | undefined;
  /** The profile's today: the quick choices and the earliest date on the wheel. */
  today: LocalDate;
  /** A quick choice or No date: sets it and goes back (M21). */
  onPick(date: LocalDate | undefined): void;
  /** The wheel, as it turns; kept only when the caller confirms (‹ Task, Done). With no date the wheel starts on today, and nothing is set until it turns. */
  onChange(date: LocalDate): void;
  /** Given, Custom is a Date row and a docked Set due date sets the date shown; no No date row, the caller's field clears it (M112). */
  onSet?(date: LocalDate): void;
}

/** Picks a due date (Quick add, task detail): Today, Tomorrow, Next week, a custom date on the wheel, No date. */
export function DueDatePicker({ value, today, onPick, onChange, onSet }: DueDatePickerProps) {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const locale = i18n.language;
  const labels = useDateLabels(today);
  const quick = [
    { label: t('dueDate.today'), date: today },
    { label: t('dueDate.tomorrow'), date: addDays(today, 1) },
    { label: t('dueDate.nextWeek'), date: nextMonday(today) },
  ];
  // A date that isn't a quick choice (a custom or past one) is Custom's: checked, with the wheel open on it.
  const isCustom = !!value && !quick.some((q) => q.date === value);
  const [custom, setCustom] = useState(isCustom);
  const shown = value ?? today;
  const wheel = custom && (
    <DateWheel
      value={shown}
      onChange={onChange}
      min={today}
      locale={locale}
      fromYear={Number(today.slice(0, 4))}
      labels={{ day: t('wheels.day'), month: t('wheels.month'), year: t('wheels.year') }}
    />
  );
  const quickRows = quick.map(({ label, date }) => (
    <ListRow
      key={label}
      label={label}
      value={formatLocalDate(date, locale, { weekday: 'short', month: 'short', day: 'numeric' })}
      selected={value === date}
      onPress={() => onPick(date)}
    />
  ));

  if (onSet) {
    return (
      <View style={styles.fill}>
        <ScrollView bounces={false} style={styles.fill}>
          {quickRows}
          <SectionLabel style={{ marginTop: space.xxl }}>{t('dueDate.customSection')}</SectionLabel>
          <ListRow
            label={t('dueDate.date')}
            icon={<Feather name="calendar" size={20} color={colors.ink3} />}
            value={<Text variant="body" color={isCustom ? 'accent' : 'ink2'}>{formatLocalDate(shown, locale, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>}
            onPress={() => setCustom((c) => !c)}
            divider={!custom}
          />
          {wheel}
        </ScrollView>
        <DockedAction label={t('dueDate.set')} detail={labels.day(shown)} onPress={() => onSet(shown)} />
      </View>
    );
  }

  return (
    <ScrollView bounces={false}>
      {quickRows}
      <ListRow
        label={t('dueDate.custom')}
        value={custom || isCustom ? <Text variant="body" color={value ? 'accent' : 'ink2'}>{labels.day(shown)}</Text> : undefined}
        selected={isCustom}
        onPress={() => setCustom((c) => !c)}
        divider={!custom}
      />
      {wheel}
      <ListRow label={t('dueDate.none')} selected={!value} onPress={() => onPick(undefined)} divider={false} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
