import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text, useTheme } from '@/shared/ui';

export interface FilterStripProps<F extends string> {
  /** The Group pill: the current grouping's name; a tap opens the Group by menu. */
  groupLabel: string;
  groupAccessibilityLabel: string;
  onGroup(): void;
  filters: { value: F; label: string }[];
  /** The one filter on, or null. */
  value: F | null;
  /** A tap on the filter that is on clears it (null). */
  onChange(value: F | null): void;
}

/**
 * One row that scrolls (M78, the hub's All tasks, look 2): the Group pill first (grey, with ⌄), a thin divider, then the
 * filters, outlined; the one on fills with the accent. Never wraps, so it never pushes the tasks down.
 */
export function FilterStrip<F extends string>({ groupLabel, groupAccessibilityLabel, onGroup, filters, value, onChange }: FilterStripProps<F>) {
  const { colors, space } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, { gap: space.sm, paddingHorizontal: space.xxl }]} style={{ marginHorizontal: -space.xxl }}>
      <Pressable onPress={onGroup} accessibilityRole="button" accessibilityLabel={groupAccessibilityLabel} hitSlop={6}
        style={({ pressed }) => [styles.pill, { backgroundColor: colors.surface2, borderColor: colors.surface2, gap: space.xs, opacity: pressed ? 0.6 : 1 }]}>
        <Feather name="sliders" size={14} color={colors.ink2} />
        <Text variant="label">{groupLabel}</Text>
        <Feather name="chevron-down" size={14} color={colors.ink3} />
      </Pressable>
      <View style={[styles.divider, { backgroundColor: colors.line }]} />
      {filters.map((f) => {
        const on = f.value === value;
        return (
          <Pressable key={f.value} onPress={() => onChange(on ? null : f.value)} accessibilityRole="button" accessibilityState={{ selected: on }} hitSlop={6}
            style={({ pressed }) => [styles.pill, { backgroundColor: on ? colors.accent : 'transparent', borderColor: on ? colors.accent : colors.line, opacity: pressed ? 0.6 : 1 }]}>
            <Text variant="label" style={{ color: on ? colors.onAccent : colors.ink2 }}>{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', paddingVertical: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', height: 32, paddingHorizontal: 13, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth * 2 },
  divider: { width: StyleSheet.hairlineWidth * 2, height: 18 },
});
