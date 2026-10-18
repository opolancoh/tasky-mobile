import { StyleSheet, View } from 'react-native';

import { dayOfMonth } from '@/core/dates/calendar';
import type { LocalDate } from '@/core/types';
import { fonts, Text, useTheme } from '@/shared/ui';

/** A day in List (M72): its number large (30 pt, bold), the weekday and "Today", "Tomorrow" or the month under it; today in accent. */
export function DayHeading({ date, weekday, under, isToday }: { date: LocalDate; weekday: string; under: string; isToday: boolean }) {
  const { colors, space } = useTheme();
  return (
    <View accessible accessibilityRole="header" style={[styles.row, { gap: space.md, marginTop: space.lg, paddingBottom: space.xs, borderBottomColor: colors.line }]}>
      <Text style={[styles.number, { color: isToday ? colors.accent : colors.ink }]}>{dayOfMonth(date)}</Text>
      <View>
        <Text variant="label" style={styles.weekday}>{weekday}</Text>
        <Text variant="caption" color={isToday ? 'accent' : 'ink3'}>{under}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  number: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, minWidth: 36, fontVariant: ['tabular-nums'] },
  weekday: { fontSize: 14.5, lineHeight: 18 },
});
