import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/shared/ui';

export interface CheckCircleProps {
  checked: boolean;
  /** The toggle is on its way (M75): a spinner in its place, no taps. */
  saving: boolean;
  onPress(): void;
  /** "Complete Pay the rent", "Reopen …". */
  label: string;
}

/**
 * A task's round checkbox (M75, option A): filled with a check when done; while its toggle saves, a small spinner takes
 * its place and it takes no taps; when the answer is in, the circle pops back (on the UI thread).
 */
export function CheckCircle({ checked, saving, onPress, label }: CheckCircleProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const wasSaving = useRef(saving);
  useEffect(() => {
    if (wasSaving.current && !saving) scale.value = withSequence(withTiming(0.7, { duration: 0 }), withSpring(1, { damping: 9, stiffness: 260 }));
    wasSaving.current = saving;
  }, [saving, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (saving) {
    return <ActivityIndicator size="small" color={colors.accent} style={styles.box} accessibilityLabel={label} accessibilityState={{ busy: true }} />;
  }
  return (
    <Animated.View style={pop}>
      <Pressable
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        hitSlop={11}
        style={[styles.box, styles.circle, { borderColor: checked ? colors.accent : colors.ink3, backgroundColor: checked ? colors.accent : 'transparent' }]}
      >
        {checked && <Feather name="check" size={14} color={colors.onAccent} />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { width: 22, height: 22, marginTop: 1 },
  circle: { borderRadius: 11, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
});
