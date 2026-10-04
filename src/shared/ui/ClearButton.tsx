import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from './theme';

export interface ClearButtonProps {
  onPress(): void;
  /** Read by screen readers, e.g. "Remove due date". */
  accessibilityLabel: string;
  /** Drawn size of the ✕; the touch target is always 44 pt. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The ✕ that clears a value: 44 pt target (HIG) drawn like the 20 pt chevron it replaces, flush with the
 * row's right padding. ink3, ink while pressed.
 */
export function ClearButton({ onPress, accessibilityLabel, size = 18, style }: ClearButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={12} style={[styles.button, style]}>
      {({ pressed }) => <Feather name="x" size={size} color={pressed ? colors.ink : colors.ink3} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, marginVertical: -12, marginRight: -12, alignItems: 'center', justifyContent: 'center' },
});
