import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatLocalDate, formatLocalTime } from '@/core/dates/localDate';
import type { LocalDate, LocalTime } from '@/core/types';
import { earliestReminder, quickReminders, reminderPresets, sameReminder, type ReminderAt } from '@/core/dates/reminders';
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
  /** The Reminder sheet (M114): its own choices, "Set time" on the docked button, and no note about tasks' reminders. */
  forReminder?: boolean;
  /** The task's due date: On its due date is offered while it's ahead. */
  due?: LocalDate | null;
}

/**
 * Picks the caller's reminder on a task (Quick add's Reminder page, task detail) or a reminder's time (M114): quick choices as a list (`onPick`; a
 * reminder's are its chips'), then a custom date and time with the
 * shared DateWheel and TimeWheel (one open at a time), then Remove reminder or a docked Set reminder. That only the user gets it is said here, once, not on
 * the task's rows.
 */
export function ReminderPicker({ value, onChange, onPick, onRemove, onSet, now, forReminder = false, due }: ReminderPickerProps) {
  const { t, i18n } = useTranslation();
  const { colors, radius, space } = useTheme();
  const locale = i18n.language;
  // The Reminder sheet offers its own chips' choices (M114); a task's reminder, the four presets.
  const presets = forReminder ? quickReminders(now) : reminderPresets(now, due);
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
      {presets.map(({ id, at }, i) => {
        const selected = sameReminder(at, value);
        return (
          <ListRow
            key={id}
            label={t(`reminders.${id}`)}
            value={<Text variant="body" color={selected ? 'accent' : 'ink2'}>{at.date === now.date ? formatLocalTime(at.time, locale) : `${formatLocalDate(at.date, locale, { weekday: 'short' })}, ${formatLocalTime(at.time, locale)}`}</Text>}
            selected={selected}
            onPress={() => onPick(at)}
            divider={i < presets.length - 1}
          />
        );
      })}
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
      {!forReminder && <Text variant="footnote" color="ink3" style={{ marginTop: space.md }}>{t('reminders.onlyYou')}</Text>}

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
      <DockedAction label={t(forReminder ? 'reminders.setTime' : 'reminders.set')} detail={when} onPress={() => onSet(atLeast(shown))} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
