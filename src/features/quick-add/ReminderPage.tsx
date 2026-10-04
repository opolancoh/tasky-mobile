import { Feather } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatLocalDate, formatLocalTime } from '@/core/dates/localDate';
import type { LocalDate, LocalTime } from '@/core/types';
import { DateWheel, ListRow, Text, TimeWheel, useTheme } from '@/shared/ui';

import { reminderPresets, sameReminder, type ReminderAt } from './reminder';

interface ReminderPageProps {
  /** The current reminder, or null for none; changes are reported as they happen. */
  value: ReminderAt | null;
  onChange(value: ReminderAt): void;
  /** A quick choice: sets it and returns to the form (like Due date's quick choices). */
  onPick(value: ReminderAt): void;
  onRemove(): void;
  /** "Now" in the profile's time zone. */
  now: { date: LocalDate; time: LocalTime };
}

/**
 * Reminder, a page of the Quick add sheet: four quick choices (a tap returns to the form), then a custom date and time with the
 * shared DateWheel and TimeWheel (one open at a time), and Remove reminder.
 */
export function ReminderPage({ value, onChange, onPick, onRemove, now }: ReminderPageProps) {
  const { t, i18n } = useTranslation();
  const { colors, radius, space } = useTheme();
  const [open, setOpen] = useState<'date' | 'time' | null>(null);
  const locale = i18n.language;
  const presets = reminderPresets(now);
  // With no reminder yet, the custom rows start from tomorrow 9:00; nothing is chosen until a tap or a scroll.
  const shown = value ?? presets.find((p) => p.id === 'tomorrow')!.at;
  const valueColor = value ? 'accent' : 'ink2';
  const toggle = (which: 'date' | 'time') => setOpen((o) => (o === which ? null : which));

  return (
    <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
      <View style={[styles.grid, { gap: space.md }]}>
        {presets.map(({ id, at }) => (
          <PresetCard
            key={id}
            label={t(`quickAdd.reminder.${id}`)}
            detail={id === 'laterToday' ? formatLocalTime(at.time, locale) : `${formatLocalDate(at.date, locale, { weekday: 'short' })}, ${formatLocalTime(at.time, locale)}`}
            selected={sameReminder(at, value)}
            onPress={() => onPick(at)}
          />
        ))}
      </View>

      <Text variant="label" color="ink3" style={{ marginTop: space.xxl, marginBottom: space.xs, letterSpacing: 0.6 }}>
        {t('quickAdd.reminder.custom').toUpperCase()}
      </Text>
      <ListRow
        label={t('quickAdd.reminder.date')}
        icon={<Feather name="calendar" size={20} color={colors.ink3} />}
        value={<Text variant="body" color={valueColor}>{formatLocalDate(shown.date, locale, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>}
        onPress={() => toggle('date')}
        divider={open !== 'date'}
      />
      {open === 'date' && (
        <DateWheel
          value={shown.date}
          onChange={(date) => onChange({ ...shown, date: date < now.date ? now.date : date })}
          locale={locale}
          fromYear={Number(now.date.slice(0, 4))}
          labels={{ day: t('wheels.day'), month: t('wheels.month'), year: t('wheels.year') }}
        />
      )}
      <ListRow
        label={t('quickAdd.reminder.time')}
        icon={<Feather name="clock" size={20} color={colors.ink3} />}
        value={<Text variant="body" color={valueColor}>{formatLocalTime(shown.time, locale)}</Text>}
        onPress={() => toggle('time')}
        divider={false}
      />
      {open === 'time' && (
        <TimeWheel
          value={shown.time}
          onChange={(time) => onChange({ ...shown, time })}
          locale={locale}
          labels={{ hour: t('wheels.hour'), minute: t('wheels.minute'), period: t('wheels.period') }}
        />
      )}

      <Pressable onPress={onRemove} accessibilityRole="button" style={[styles.remove, { marginTop: space.xxl, borderRadius: radius.md }]}>
        {({ pressed }) => (
          <Text variant="bodyMedium" color="danger" style={{ opacity: pressed ? 0.6 : 1 }}>
            {t('quickAdd.reminder.remove')}
          </Text>
        )}
      </Pressable>
    </ScrollView>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  /** Two per row: half the width minus half the gap. */
  card: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, gap: 2 },
  remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
