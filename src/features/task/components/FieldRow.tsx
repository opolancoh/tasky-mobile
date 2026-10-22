import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ClearButton, Text, useTheme } from '@/shared/ui';

/**
 * A Task detail field (M98): empty, its icon and what a tap does in grey ("Add due date"); set, the icon and the value
 * in the accent, a detail under it and ✕ to clear. No label and no chevron: the icon says what the row is.
 */
export function FieldRow({ icon, placeholder, value, detail, onPress, onClear, clearLabel }: {
  /** Drawn in the color the row gives it: the accent when set, grey when empty. */
  icon(color: string): ReactNode;
  placeholder: string;
  /** Empty when falsy; a string is drawn in the accent. */
  value?: ReactNode;
  detail?: ReactNode;
  onPress?(): void;
  onClear?(): void;
  clearLabel?: string;
}) {
  const { colors, space } = useTheme();
  const set = !!value;
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.xs, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
          <View style={styles.icon}>{icon(set ? colors.accent : colors.ink3)}</View>
          <View style={styles.main}>
            {!set ? <Text variant="body" color="ink2">{placeholder}</Text>
              : typeof value === 'string' ? <Text variant="body" color="accent" numberOfLines={2}>{value}</Text>
              : value}
            {set && (typeof detail === 'string' ? <Text variant="caption" color="ink2" numberOfLines={2}>{detail}</Text> : detail)}
          </View>
          {set && onClear && <ClearButton onPress={onClear} accessibilityLabel={clearLabel ?? ''} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 50 },
  icon: { width: 24, alignItems: 'center' },
  main: { flex: 1, minWidth: 0, gap: 2 },
});
