import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { addDays, formatLocalDate, formatLocalTime, nextMonday } from '@/core/dates/localDate';
import { earliestReminder, quickReminders, reminderPresets, type ReminderAt } from '@/core/dates/reminders';
import type { LocalDate, LocalTime } from '@/core/types';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { DateWheel, DockedAction, ListRow, SectionLabel, Text, TimeWheel, useTheme, warnHaptic } from '@/shared/ui';

/** A date, and a time for a reminder. */
interface When {
  date: LocalDate;
  time?: LocalTime;
}

type Now = { date: LocalDate; time: LocalTime };

interface Handlers<T> {
  /** The value set now, or null. */
  value: T | null;
  /** A quick choice: sets it and goes back (M21). */
  onPick(value: T): void;
  /** The docked button (M112): sets the date (and time) on the wheels. Left out in a form whose own Save confirms (Hold's Until), which hears the wheels through `onChange`. */
  onSet?(value: T): void;
  onChange?(value: T): void;
  /** A last button that clears it, only where no field of the caller's has a ✕ (Bulk, Hold's Until). */
  clear?: { label: string; onPress(): void };
}

type DatePickerProps =
  /** A due date: Today, Tomorrow, Next week. */
  | ({ kind: 'due'; today: LocalDate } & Handlers<LocalDate>)
  /** A task's reminder (its four presets, "Only you get it") or, with `forReminder`, a reminder's time (M114). */
  | ({ kind: 'reminder'; now: Now; due?: LocalDate | null; forReminder?: boolean } & Handlers<ReminderAt>);

const same = (a: When | null, b: When | null) => !!a && !!b && a.date === b.date && a.time === b.time;
const DAY = { weekday: 'short', month: 'short', day: 'numeric' } as const;

/**
 * Every date picker in the app (M122): quick choices as rows, then Custom with a Date row (and Time for a reminder)
 * that opens its wheel below, one at a time, then a docked Set. The wheels' value stays here until Set; ‹, Cancel or a
 * tap outside drops it.
 */
export function DatePicker(props: DatePickerProps) {
  const { clear } = props;
  // In and out as the caller's type: a LocalDate for a due date, a ReminderAt for a reminder.
  const value: When | null = props.kind === 'due' ? (props.value ? { date: props.value } : null) : props.value;
  const out = (w: When) => (props.kind === 'due' ? w.date : w) as LocalDate & ReminderAt;
  const onPick = (w: When) => props.onPick(out(w));
  const onChange = props.onChange && ((w: When) => props.onChange!(out(w)));
  const onSet = props.onSet && ((w: When) => props.onSet!(out(w)));
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const locale = i18n.language;
  const { choices, start, earliest, today } = options(props, t);
  const labels = useDateLabels(today);
  const withTime = start.time !== undefined;

  const [open, setOpen] = useState<'date' | 'time' | null>(() => (value && !choices.some((c) => same(c.value, value)) ? 'date' : null));
  const [picked, setPicked] = useState<When | null>(null);
  const shown = picked ?? value ?? start;
  const valueColor = picked || value ? 'accent' : 'ink2';
  const [tooEarly, setTooEarly] = useState(false);
  const toggle = (which: 'date' | 'time') => setOpen((o) => (o === which ? null : which));
  const turn = (w: When) => {
    setPicked(w);
    setTooEarly(false);
    onChange?.(w);
  };
  // The wheels take any date; only a reminder in the past is refused, on Set, saying why (M122).
  const set = () => {
    if (earliest && (shown.date < earliest.date || (shown.date === earliest.date && shown.time! < earliest.time))) {
      setTooEarly(true);
      warnHaptic();
      return;
    }
    onSet!(shown);
  };
  const choiceText = (w: When) =>
    !w.time ? formatLocalDate(w.date, locale, DAY)
    : w.date === today ? formatLocalTime(w.time, locale)
    : `${formatLocalDate(w.date, locale, { weekday: 'short' })}, ${formatLocalTime(w.time, locale)}`;

  const rows = (
    <>
      {choices.map((c, i) => {
        const selected = same(c.value, value);
        return (
          <ListRow
            key={c.key}
            label={c.label}
            value={<Text variant="body" color={selected ? 'accent' : 'ink2'}>{choiceText(c.value)}</Text>}
            selected={selected}
            onPress={() => onPick(c.value)}
            divider={i < choices.length - 1}
          />
        );
      })}
      <SectionLabel style={{ marginTop: space.xxl }}>{t('dueDate.customSection')}</SectionLabel>
      <ListRow
        label={t('dueDate.date')}
        icon={<Feather name="calendar" size={20} color={colors.ink3} />}
        value={<Text variant="body" color={valueColor}>{formatLocalDate(shown.date, locale, DAY)}</Text>}
        onPress={() => toggle('date')}
        divider={withTime ? open !== 'date' : false}
      />
      {open === 'date' && (
        <DateWheel
          value={shown.date}
          onChange={(date) => turn({ ...shown, date })}
          locale={locale}
          fromYear={Number(today.slice(0, 4))}
          labels={{ day: t('wheels.day'), month: t('wheels.month'), year: t('wheels.year') }}
        />
      )}
      {withTime && (
        <ListRow
          label={t('reminders.time')}
          icon={<Feather name="clock" size={20} color={colors.ink3} />}
          value={<Text variant="body" color={valueColor}>{formatLocalTime(shown.time!, locale)}</Text>}
          onPress={() => toggle('time')}
          divider={false}
        />
      )}
      {open === 'time' && (
        <TimeWheel
          value={shown.time!}
          onChange={(time) => turn({ ...shown, time })}
          locale={locale}
          labels={{ hour: t('wheels.hour'), minute: t('wheels.minute'), period: t('wheels.period') }}
        />
      )}
      {tooEarly && earliest && (
        <Text variant="footnote" color="danger" accessibilityLiveRegion="polite" style={{ marginTop: space.md }}>
          {t('reminders.inPast', { when: `${labels.day(earliest.date)}, ${formatLocalTime(earliest.time, locale)}` })}
        </Text>
      )}
      {props.kind === 'reminder' && !props.forReminder && <Text variant="footnote" color="ink3" style={{ marginTop: space.md }}>{t('reminders.onlyYou')}</Text>}
      {clear && (
        <Pressable onPress={clear.onPress} accessibilityRole="button" style={[styles.clear, { marginTop: space.xxl }]}>
          {({ pressed }) => (
            <Text variant="bodyMedium" color="danger" style={{ opacity: pressed ? 0.6 : 1 }}>
              {clear.label}
            </Text>
          )}
        </Pressable>
      )}
    </>
  );

  if (!onSet) return <View>{rows}</View>;
  const setLabel = props.kind === 'due' ? t('dueDate.set') : t(props.forReminder ? 'reminders.setTime' : 'reminders.set');
  const detail = withTime ? `${formatLocalDate(shown.date, locale, DAY)}, ${formatLocalTime(shown.time!, locale)}` : labels.day(shown.date);
  return (
    <View style={styles.fill}>
      <ScrollView bounces={false} style={styles.fill}>{rows}</ScrollView>
      <DockedAction label={setLabel} detail={detail} onPress={set} />
    </View>
  );
}

/** The quick choices, where the wheels start with nothing set, and a reminder's earliest time. */
function options(props: DatePickerProps, t: TFunction): { choices: { key: string; label: string; value: When }[]; start: When; earliest?: ReminderAt; today: LocalDate } {
  if (props.kind === 'due') {
    const { today } = props;
    const choices = [
      { key: 'today', label: t('dueDate.today'), value: { date: today } },
      { key: 'tomorrow', label: t('dueDate.tomorrow'), value: { date: addDays(today, 1) } },
      { key: 'nextWeek', label: t('dueDate.nextWeek'), value: { date: nextMonday(today) } },
    ];
    return { choices, start: { date: today }, today };
  }
  const { now, due, forReminder } = props;
  const presets = forReminder ? quickReminders(now) : reminderPresets(now, due);
  const choices = presets.map(({ id, at }) => ({ key: id, label: t(`reminders.${id}`), value: at }));
  // With no reminder yet the wheels start from tomorrow 9:00; nothing in the past (M95).
  return { choices, start: presets.find((p) => p.id === 'tomorrow')!.at, earliest: earliestReminder(now), today: now.date };
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  clear: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
