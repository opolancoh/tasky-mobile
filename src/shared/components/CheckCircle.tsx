import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Spinner, useTheme } from '@/shared/ui';

export interface CheckCircleProps {
  checked: boolean;
  /** The toggle is on its way (M75): a spinner in its place, no taps. */
  saving: boolean;
  onPress(): void;
  /** "Complete Pay the rent", "Reopen …". */
  label: string;
  /** 22 in lists; Task detail's is 28. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A task's round checkbox (M75, option A): filled with a check when done; while its toggle saves, a spinning ring takes
 * its place and it takes no taps; when the answer is in, the circle pops back (on the UI thread).
 */
export function CheckCircle({ checked, saving, onPress, label, size = 22, style }: CheckCircleProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const wasSaving = useRef(saving);
  useEffect(() => {
    if (wasSaving.current && !saving) scale.value = withSequence(withTiming(0.7, { duration: 0 }), withSpring(1, { damping: 9, stiffness: 260 }));
    wasSaving.current = saving;
  }, [saving, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (saving) {
    return <Spinner size={size} accessibilityLabel={label} style={style ?? styles.spin} />;
  }
  return (
    <Animated.View style={[pop, style ?? styles.spin]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        hitSlop={11}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2, borderColor: checked ? colors.accent : colors.ink3, backgroundColor: checked ? colors.accent : 'transparent' }]}
      >
        {checked && <Feather name="check" size={Math.round(size * 0.6)} color={colors.onAccent} />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spin: { marginTop: 1 },
  circle: { borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
});
