import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { dayOfMonth, monthOf } from '@/core/dates/calendar';
import { addDays, formatLocalDate } from '@/core/dates/localDate';
import type { LocalDate } from '@/core/types';
import type { TaskSummary } from '@/data/tasks/types';
import { fonts, radius, Text, useTheme } from '@/shared/ui';

/** A Monday, to read the weekdays' letters from (M, T, W… in the app's language). */
const A_MONDAY = '2024-01-01';
const DAYS = [0, 1, 2, 3, 4, 5, 6];

export interface MonthGridProps {
  /** The Mondays of the weeks to draw: a month's (4–6) or one week. */
  weeks: LocalDate[];
  /** The month on screen: its days only (the other cells stay empty). Undefined for a week. */
  month?: string;
  today: LocalDate;
  picked: LocalDate | null;
  /** Open tasks by due date. */
  byDay: Map<LocalDate, TaskSummary[]>;
  onPick(date: LocalDate): void;
}

/**
 * The Calendar's month or week (M72), weeks from Monday: each day's number (today in accent, the picked day filled) and up
 * to 3 dots in its tasks' list colors, "+" past 3; past days fade.
 */
export function MonthGrid({ weeks, month, today, picked, byDay, onPick }: MonthGridProps) {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const locale = i18n.language;

  return (
    <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.line, paddingTop: space.sm, paddingHorizontal: space.xs, paddingBottom: space.xs }]}>
      <View style={styles.week} importantForAccessibility="no-hide-descendants">
        {DAYS.map((i) => (
          <Text key={i} variant="caption" color="ink3" align="center" style={styles.cell}>
            {formatLocalDate(addDays(A_MONDAY, i), locale, { weekday: 'narrow' })}
          </Text>
        ))}
      </View>
      {weeks.map((monday) => (
        <View key={monday} style={styles.week}>
          {DAYS.map((i) => {
            const date = addDays(monday, i);
            if (month && monthOf(date) !== month) return <View key={date} style={styles.cell} />;
            const tasks = byDay.get(date) ?? [];
            const on = date === picked, isToday = date === today, past = date < today;
            return (
              <Pressable
                key={date}
                onPress={() => onPick(date)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t('calendar.dayTasks', { date: formatLocalDate(date, locale, { weekday: 'long', month: 'long', day: 'numeric' }), count: tasks.length })}
                style={[styles.cell, styles.day]}
              >
                <View style={[styles.number, on && { backgroundColor: colors.accent }]}>
                  <Text
                    variant="callout"
                    style={{ fontFamily: isToday || on ? fonts.bold : fonts.semibold, color: on ? colors.onAccent : isToday ? colors.accent : past ? colors.ink3 : colors.ink, fontVariant: ['tabular-nums'] }}
                  >
                    {dayOfMonth(date)}
                  </Text>
                </View>
                <View style={[styles.dots, past && styles.faded]}>
                  {tasks.slice(0, 3).map((task) => (
                    <View key={task.id} style={[styles.dot, { backgroundColor: task.taskList?.isInbox ? colors.accent : task.taskList?.color || colors.ink3 }]} />
                  ))}
                  {tasks.length > 3 && <Text variant="caption" color="ink3" style={styles.more}>+</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg + 2 },
  week: { flexDirection: 'row' },
  cell: { flex: 1 },
  day: { alignItems: 'center', minHeight: 44, paddingTop: 1, paddingBottom: 3, gap: 2 },
  number: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dots: { height: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  more: { fontSize: 10, lineHeight: 10, fontFamily: fonts.bold },
  faded: { opacity: 0.5 },
});
