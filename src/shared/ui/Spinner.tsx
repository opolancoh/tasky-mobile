import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { faint } from './ColorDot';
import { useTheme } from './theme';

export interface SpinnerProps {
  /** Width and height; 22 matches a task's circle. */
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A ring that spins (M75): a faint accent track with one accent arc, turning on the UI thread (Reanimated). The same on
 * iOS and Android, unlike `ActivityIndicator`.
 */
export function Spinner({ size = 22, accessibilityLabel, style }: SpinnerProps) {
  const { colors, scheme } = useTheme();
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1);
    return () => cancelAnimation(turn);
  }, [turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: faint(colors.accent, scheme), borderTopColor: colors.accent }, spin, style]}
    />
  );
}
