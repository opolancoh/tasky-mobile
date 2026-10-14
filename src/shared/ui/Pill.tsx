import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { useDelayedFlag } from './useDelayedFlag';

export interface PillProps {
  label: string;
  onPress(): void;
  /** accent: the row's main action (accent on its soft fill) · quiet: the other one (ink2 on a grey fill) · danger: a count to look at (danger on its soft fill). */
  tone?: 'accent' | 'quiet' | 'danger';
  /** Left of the label, e.g. a flag. */
  icon?: ReactNode;
  disabled?: boolean;
  /** Saving (M56): disabled and busy for screen readers at once; a spinner over the label after 300 ms (same width). */
  busy?: boolean;
  accessibilityLabel?: string;
}

/**
 * A small rounded button for an action inside a row or a chip under a heading ("Join", "Accept", "⚑ 3 important").
 * 32 pt tall, with its hit area grown to 44 pt (HIG).
 */
export function Pill({ label, onPress, tone = 'accent', icon, disabled, busy = false, accessibilityLabel }: PillProps) {
  const { colors, space } = useTheme();
  const bg = tone === 'accent' ? colors.accentSoft : tone === 'danger' ? colors.dangerSoft : colors.surface2;
  const fg = tone === 'accent' ? 'accent' : tone === 'danger' ? 'danger' : 'ink2';
  const spinner = useDelayedFlag(busy);
  const inactive = !!disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [styles.pill, { backgroundColor: bg, paddingHorizontal: space.md, gap: space.xs, opacity: pressed || (inactive && !spinner) ? 0.6 : 1 }]}
    >
      <View style={[styles.content, { gap: space.xs, opacity: spinner ? 0 : 1 }]}>
        {icon && <View>{icon}</View>}
        <Text variant="label" color={fg}>
          {label}
        </Text>
      </View>
      {spinner && <ActivityIndicator size="small" color={colors[fg]} style={StyleSheet.absoluteFill} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { flexDirection: 'row', alignItems: 'center' },
  pill: { minHeight: 32, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
