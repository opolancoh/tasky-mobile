import { Feather } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatLocalDate, formatLocalTime } from '@/core/dates/localDate';
import type { LocalDate, LocalTime } from '@/core/types';
import { earliestReminder, reminderPresets, sameReminder, type ReminderAt } from '@/core/dates/reminders';
import { DateWheel, DockedAction, ListRow, SectionLabel, Text, TimeWheel, useTheme } from '@/shared/ui';

interface ReminderPickerProps {
  /** The current reminder, or null for none; changes are reported as they happen. */
  value: ReminderAt | null;
  onChange(value: ReminderAt): void;
  /** A quick choice: sets it and returns to the form (like Due date's quick choices). */
  onPick(value: ReminderAt): void;
  /** Remove reminder at the end; left out where the caller's field clears it (Quick add). */
  onRemove?(): void;
  /** Given, a docked Set reminder sets the date and time shown (M112). */
  onSet?(value: ReminderAt): void;
  /** "Now" in the profile's time zone. */
  now: { date: LocalDate; time: LocalTime };
}

/**
 * Picks the caller's reminder on a task (Quick add's Reminder page, task detail): four quick choices (`onPick`), then a custom date and time with the
 * shared DateWheel and TimeWheel (one open at a time), then Remove reminder or a docked Set reminder. That only the user gets it is said here, once, not on
 * the task's rows.
 */
export function ReminderPicker({ value, onChange, onPick, onRemove, onSet, now }: ReminderPickerProps) {
  const { t, i18n } = useTranslation();
  const { colors, radius, space } = useTheme();
  const locale = i18n.language;
  const presets = reminderPresets(now);
  // Nothing in the past: no date before the earliest, and on that date no time before it.
  const earliest = earliestReminder(now);
  const atLeast = (at: ReminderAt): ReminderAt => (at.date < earliest.date || (at.date === earliest.date && at.time < earliest.time) ? earliest : at);
  // A reminder that isn't a quick choice opens on its date wheel, like Due date's Custom.
  const [open, setOpen] = useState<'date' | 'time' | null>(() => (value && !presets.some((p) => sameReminder(p.at, value)) ? 'date' : null));
  // With no reminder yet, the custom rows start from tomorrow 9:00; nothing is chosen until a tap or a scroll.
  const shown = value ?? presets.find((p) => p.id === 'tomorrow')!.at;
  const valueColor = value ? 'accent' : 'ink2';
  const toggle = (which: 'date' | 'time') => setOpen((o) => (o === which ? null : which));

  const list = (
    <ScrollView keyboardShouldPersistTaps="handled" bounces={false} style={onSet && styles.fill}>
      <View style={[styles.grid, { gap: space.md }]}>
        {presets.map(({ id, at }) => (
          <PresetCard
            key={id}
            label={t(`reminders.${id}`)}
            detail={id === 'laterToday' ? formatLocalTime(at.time, locale) : `${formatLocalDate(at.date, locale, { weekday: 'short' })}, ${formatLocalTime(at.time, locale)}`}
            selected={sameReminder(at, value)}
            onPress={() => onPick(at)}
          />
        ))}
      </View>
      <SectionLabel style={{ marginTop: space.xxl }}>{t('reminders.custom')}</SectionLabel>
      <ListRow
        label={t('reminders.date')}
        icon={<Feather name="calendar" size={20} color={colors.ink3} />}
        value={<Text variant="body" color={valueColor}>{formatLocalDate(shown.date, locale, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>}
        onPress={() => toggle('date')}
        divider={open !== 'date'}
      />
      {open === 'date' && (
        <DateWheel
          value={shown.date}
          onChange={(date) => onChange(atLeast({ ...shown, date }))}
          min={earliest.date}
          locale={locale}
          fromYear={Number(now.date.slice(0, 4))}
          labels={{ day: t('wheels.day'), month: t('wheels.month'), year: t('wheels.year') }}
        />
      )}
      <ListRow
        label={t('reminders.time')}
        icon={<Feather name="clock" size={20} color={colors.ink3} />}
        value={<Text variant="body" color={valueColor}>{formatLocalTime(shown.time, locale)}</Text>}
        onPress={() => toggle('time')}
        divider={false}
      />
      {open === 'time' && (
        <TimeWheel
          value={shown.time}
          onChange={(time) => onChange({ ...shown, time })}
          min={shown.date === earliest.date ? earliest.time : undefined}
          locale={locale}
          labels={{ hour: t('wheels.hour'), minute: t('wheels.minute'), period: t('wheels.period') }}
        />
      )}
      <Text variant="footnote" color="ink3" style={{ marginTop: space.md }}>{t('reminders.onlyYou')}</Text>

      {onRemove && (
        <Pressable onPress={onRemove} accessibilityRole="button" style={[styles.remove, { marginTop: space.xxl, borderRadius: radius.md }]}>
          {({ pressed }) => (
            <Text variant="bodyMedium" color="danger" style={{ opacity: pressed ? 0.6 : 1 }}>
              {t('reminders.remove')}
            </Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
  if (!onSet) return list;
  const when = `${formatLocalDate(shown.date, locale, { weekday: 'short', month: 'short', day: 'numeric' })}, ${formatLocalTime(shown.time, locale)}`;
  return (
    <View style={styles.fill}>
      {list}
      <DockedAction label={t('reminders.set')} detail={when} onPress={() => onSet(atLeast(shown))} />
    </View>
  );
}

const PresetCard = memo(function PresetCard({ label, detail, selected, onPress }: { label: string; detail: string; selected: boolean; onPress(): void }) {
  const { colors, radius, space } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}, ${detail}`}
      style={({ pressed }) => [
        styles.card,
        {
          padding: space.md,
          borderRadius: radius.lg,
          borderColor: selected ? colors.accent : colors.line,
          backgroundColor: selected ? colors.accentSoft : pressed ? colors.surface2 : colors.surface,
        },
      ]}
    >
      <Text variant="bodyMedium" color={selected ? 'accent' : 'ink'}>
        {label}
      </Text>
      <Text variant="subhead" color={selected ? 'accent' : 'ink2'}>
        {detail}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  /** Two per row: half the width minus half the gap. */
  card: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, gap: 2 },
  remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
