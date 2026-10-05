import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from './theme';

export interface SkeletonProps {
  width: DimensionValue;
  height: number;
  /** Corner radius; half the height for a circle. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A grey placeholder where content will be, with a soft shimmer (M27). The shimmer runs on the UI thread
 * (Reanimated) and stops with Reduce Motion. Hidden from screen readers: the screen says it's loading instead.
 */
export function Skeleton({ width, height, radius = 6, style }: SkeletonProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [size, setSize] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    x.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1);
    return () => cancelAnimation(x);
  }, [reduced, x]);

  const band = useAnimatedStyle(() => ({ transform: [{ translateX: (x.value * 2 - 1) * size }] }));

  return (
    <View
      onLayout={(e) => setSize(e.nativeEvent.layout.width)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface2, overflow: 'hidden' }, style]}
    >
      {!reduced && size > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, band]}>
          <LinearGradient colors={['transparent', `${colors.surface}99`, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
    </View>
  );
}

/** A list row being loaded: a circle and two lines, as tall as a task row. `width` is the first line's, in percent. */
export function SkeletonRow({ width = 70 }: { width?: number }) {
  const { space } = useTheme();
  return (
    <View style={[styles.row, { gap: space.md, paddingVertical: space.md }]}>
      <Skeleton width={22} height={22} radius={11} />
      <View style={[styles.lines, { gap: space.sm }]}>
        <Skeleton width={`${width}%`} height={14} />
        <Skeleton width="40%" height={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  lines: { flex: 1, paddingTop: 2 },
});
