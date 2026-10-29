import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

export interface DockedActionProps {
  label: string;
  /** What the action applies, on a second line (e.g. "Tue, Sep 29, 9:00 AM"). */
  detail: string;
  onPress(): void;
}

/** A sheet page's one action, docked under its scrolling content (M112): the label and what it applies. */
export function DockedAction({ label, detail, onPress }: DockedActionProps) {
  const { colors, radius, space } = useTheme();
  return (
    <View style={[styles.bar, { marginHorizontal: -space.lg, paddingHorizontal: space.lg, paddingTop: space.md, borderTopColor: colors.line }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${detail}`}
        style={({ pressed }) => [styles.button, { borderRadius: radius.lg, paddingVertical: space.sm, backgroundColor: pressed ? colors.accentPressed : colors.accent }]}
      >
        <Text variant="bodyMedium" color="onAccent">{label}</Text>
        <Text variant="footnote" color="onAccent">{detail}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 1 },
});
