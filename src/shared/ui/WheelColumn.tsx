import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

/** Row height: a 44 pt touch target (HIG). The wheel shows five rows; the middle one is the value. */
export const WHEEL_ROW = 44;
export const WHEEL_ROWS = 5;
const PAD = WHEEL_ROW * Math.floor(WHEEL_ROWS / 2);

export interface WheelColumnProps {
  /** What each row shows, already formatted ("9", "00", "September"). */
  labels: readonly string[];
  /** The selected row. */
  index: number;
  onChange(index: number): void;
  /** Read by screen readers, e.g. "Hour". */
  accessibilityLabel: string;
  width?: number;
  /** Left, center or right inside the column. */
  align?: 'left' | 'center' | 'right';
}

/**
 * One column of a wheel picker. It snaps to rows; rows fade and shrink away from the middle with
 * native-driver animations, so scrolling doesn't re-render. `onChange` fires once the wheel settles.
 * Screen readers get an adjustable control: swipe up or down to change the value.
 * The selection band is drawn by the picker that holds the columns (TimeWheel, DateWheel).
 */
export const WheelColumn = memo(function WheelColumn({ labels, index, onChange, accessibilityLabel, width, align = 'center' }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [scrollY] = useState(() => new Animated.Value(index * WHEEL_ROW));
  const settled = useRef(index);   // the index the wheel rests on; avoids echoing a change back
  const max = labels.length - 1;

  // A new value from outside (a preset, a shorter month): move there.
  useEffect(() => {
    const target = Math.min(index, max);
    if (target === settled.current) return;
    settled.current = target;
    scrollRef.current?.scrollTo({ y: target * WHEEL_ROW, animated: true });
  }, [index, max]);

  const settle = useCallback(
    (y: number) => {
      const next = Math.max(0, Math.min(max, Math.round(y / WHEEL_ROW)));
      if (next === settled.current) return;
      settled.current = next;
      Haptics.selectionAsync().catch(() => undefined);
      onChange(next);
    },
    [max, onChange],
  );

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => settle(e.nativeEvent.contentOffset.y);
  const step = (by: number) => {
    const next = Math.max(0, Math.min(max, settled.current + by));
    scrollRef.current?.scrollTo({ y: next * WHEEL_ROW, animated: true });
    settle(next * WHEEL_ROW);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: labels[Math.min(index, max)] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={[styles.column, width ? { width } : styles.flex]}
    >
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ROW}
        decelerationRate="fast"
        nestedScrollEnabled
        contentOffset={{ x: 0, y: index * WHEEL_ROW }}   // iOS starts here; Android scrolls on layout
        onLayout={Platform.OS === 'android' ? () => scrollRef.current?.scrollTo({ y: settled.current * WHEEL_ROW, animated: false }) : undefined}
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={(e) => {
          // A slow drag ends without momentum: settle here. With momentum, onMomentumScrollEnd does.
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) onScrollEnd(e);
        }}
      >
        {labels.map((label, i) => (
          <WheelRow key={i} label={label} position={i} scrollY={scrollY} align={align} />
        ))}
      </Animated.ScrollView>
    </View>
  );
});

/** Columns side by side over one selection band: the frame every wheel picker uses. */
export function WheelFrame({ children }: { children: ReactNode }) {
  const { colors, radius } = useTheme();
  return (
    <View style={styles.frame}>
      <View pointerEvents="none" style={[styles.band, { backgroundColor: colors.surface2, borderRadius: radius.md }]} />
      {children}
    </View>
  );
}

const WheelRow = memo(function WheelRow({ label, position, scrollY, align }: { label: string; position: number; scrollY: Animated.Value; align: 'left' | 'center' | 'right' }) {
  const { type } = useTheme();
  const at = position * WHEEL_ROW;
  const inputRange = [at - 2 * WHEEL_ROW, at - WHEEL_ROW, at, at + WHEEL_ROW, at + 2 * WHEEL_ROW];
  const opacity = scrollY.interpolate({ inputRange, outputRange: [0.25, 0.55, 1, 0.55, 0.25], extrapolate: 'clamp' });
  const scale = scrollY.interpolate({ inputRange, outputRange: [0.86, 0.93, 1.06, 0.93, 0.86], extrapolate: 'clamp' });
  return (
    <Animated.View style={[styles.row, { opacity, transform: [{ scale }] }]} importantForAccessibility="no-hide-descendants">
      <Text style={[type.title, styles.label, { textAlign: align, fontSize: 21, lineHeight: 26 }]} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  frame: { flexDirection: 'row', height: WHEEL_ROW * WHEEL_ROWS },
  band: { position: 'absolute', left: 0, right: 0, top: PAD, height: WHEEL_ROW },
  column: { height: WHEEL_ROW * WHEEL_ROWS },
  flex: { flex: 1 },
  content: { paddingVertical: PAD },
  row: { height: WHEEL_ROW, justifyContent: 'center', paddingHorizontal: 8 },
  label: { fontVariant: ['tabular-nums'] },
});
