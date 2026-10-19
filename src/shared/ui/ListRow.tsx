import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ClearButton } from './ClearButton';
import { Text } from './Text';
import { useTheme } from './theme';
import { useDelayedFlag } from './useDelayedFlag';

export interface ListRowProps {
  label: string;
  /** Left of the label, 24 pt wide so labels line up. */
  icon?: ReactNode;
  /** Right-aligned value, e.g. "Inbox" or "None". */
  value?: ReactNode;
  /** Shown under the label (up to two lines), e.g. a notes preview; replaces `value`. */
  detail?: string;
  /** A control at the right edge, centered on the row, shown with or without `detail` (e.g. a switch). */
  accessory?: ReactNode;
  /** Tappable rows get a chevron; without it the row only shows information. */
  onPress?(): void;
  /** A check mark instead of the chevron, for the chosen option in a picker. */
  selected?: boolean;
  /** Shows ✕ instead of the chevron: clears the value (e.g. a due date). Needs `clearLabel`. */
  onClear?(): void;
  clearLabel?: string;
  /** Tappable rows get a chevron unless this is false (the icon already says what a tap does). */
  chevron?: boolean;
  /** Label in medium weight, for rows that are chosen. */
  strong?: boolean;
  /** A line under the row; off for the last row of a list. */
  divider?: boolean;
  /** Saving what a tap on the row chose (M56): no more taps and busy for screen readers at once; a spinner in place of the chevron or check after 300 ms. */
  busy?: boolean;
  accessibilityLabel?: string;
}

/** A settings-style row: icon, label, value or detail, chevron. At least 44 pt tall; grows with the text size. */
export function ListRow({ label, icon, value, detail, accessory, onPress, selected, onClear, clearLabel, strong, chevron = true, divider = true, busy = false, accessibilityLabel }: ListRowProps) {
  const { colors, space } = useTheme();
  const spinner = useDelayedFlag(busy);
  const valueNode = typeof value === 'string' ? <Text variant="body" color="ink2" numberOfLines={1}>{value}</Text> : value;

  const content = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        { gap: space.md, paddingVertical: detail ? space.sm + 2 : space.sm, backgroundColor: pressed ? colors.surface2 : 'transparent' },
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
        detail && !accessory ? styles.top : null,
      ]}
    >
      {icon !== undefined && <View style={styles.icon}>{icon}</View>}
      <View style={[styles.main, detail ? null : styles.inline]}>
        <Text variant={strong ? 'bodyMedium' : 'body'}>{label}</Text>
        {detail ? (
          <Text variant="subhead" color="ink2" numberOfLines={2}>
            {detail}
          </Text>
        ) : (
          valueNode && <View style={styles.value}>{valueNode}</View>
        )}
      </View>
      {accessory}
      {spinner ? (
        <ActivityIndicator size="small" color={colors.ink3} style={styles.trailing} />
      ) : onClear ? (
        <ClearButton onPress={onClear} accessibilityLabel={clearLabel ?? ''} />
      ) : selected !== undefined ? (
        <View style={styles.trailing}>{selected && <Feather name="check" size={20} color={colors.accent} />}</View>
      ) : (
        onPress && chevron && <Feather name="chevron-right" size={18} color={colors.ink3} style={styles.trailing} />
      )}
    </View>
  );

  if (!onPress) return <View accessible accessibilityLabel={accessibilityLabel}>{content(false)}</View>;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, busy, disabled: busy }}
    >
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  top: { alignItems: 'flex-start' },
  icon: { width: 24, alignItems: 'center' },
  main: { flex: 1, minWidth: 0, gap: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  value: { flexShrink: 1, alignItems: 'flex-end' },
  trailing: { width: 20, alignItems: 'center' },
});
