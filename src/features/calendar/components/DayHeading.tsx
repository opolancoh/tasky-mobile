import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { dayOfMonth } from '@/core/dates/calendar';
import type { LocalDate } from '@/core/types';
import { fonts, Text, useTheme } from '@/shared/ui';

/**
 * A day in List and under Calendar's grid (M72, M99): its number large (30 pt, bold), the weekday and "Today", "Tomorrow"
 * or the month under it; today in accent. With `onAdd`, a + at the right adds a task due that day.
 */
export function DayHeading({ date, weekday, under, isToday, onAdd, addLabel }: { date: LocalDate; weekday: string; under: string; isToday: boolean; onAdd?(): void; addLabel?: string }) {
  const { colors, space } = useTheme();
  return (
    <View style={[styles.row, styles.line, { gap: space.md, marginTop: space.lg, paddingBottom: space.xs, borderBottomColor: colors.line }]}>
      <View accessible accessibilityRole="header" style={[styles.row, styles.fill, { gap: space.md }]}>
        <Text style={[styles.number, { color: isToday ? colors.accent : colors.ink }]}>{dayOfMonth(date)}</Text>
        <View>
          <Text variant="label" style={styles.weekday}>{weekday}</Text>
          <Text variant="caption" color={isToday ? 'accent' : 'ink3'}>{under}</Text>
        </View>
      </View>
      {onAdd && (
        <Pressable onPress={onAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel={addLabel} style={({ pressed }) => [styles.add, { opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="plus" size={22} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth },
  add: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  number: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, minWidth: 36, fontVariant: ['tabular-nums'] },
  weekday: { fontSize: 14.5, lineHeight: 18 },
});
