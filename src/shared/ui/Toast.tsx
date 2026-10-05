import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { Text } from './Text';
import { useTheme } from './theme';

export interface ToastMessage {
  message: string;
  /** One action, e.g. Undo. A toast with an action stays longer. */
  action?: { label: string; onPress(): void };
}

interface ToastState {
  current: (ToastMessage & { id: number }) | null;
  show(toast: ToastMessage): void;
  hide(): void;
}

/** The one toast on screen; a new one replaces it. Readable outside React: `useToast.getState().show(…)`. */
export const useToast = create<ToastState>()((set) => ({
  current: null,
  show: (toast) => set((s) => ({ current: { ...toast, id: (s.current?.id ?? 0) + 1 } })),
  hide: () => set({ current: null }),
}));

const SHORT = 2500;
const WITH_ACTION = 5000;

/**
 * Shows `useToast`'s message above the tab bar: dark card, the message and an optional action. Mount once at
 * the app root, after the navigator. Fades in and out on the UI thread (Reanimated); announced to screen readers.
 */
export function ToastHost() {
  const current = useToast((s) => s.current);
  const hide = useToast((s) => s.hide);
  const { colors, radius, space } = useTheme();
  const insets = useSafeAreaInsets();
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withTiming(current ? 1 : 0, { duration: 180 });
    if (!current) return;
    const timer = setTimeout(hide, current.action ? WITH_ACTION : SHORT);
    return () => clearTimeout(timer);
  }, [current, hide, shown]);

  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 12 }] }));

  if (!current) return null;
  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 64, paddingHorizontal: space.lg }, style]}>
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.card, { backgroundColor: colors.toastBg, borderRadius: radius.md, paddingLeft: space.lg, gap: space.md }]}
      >
        <Text variant="callout" style={[styles.message, { color: colors.toastInk }]}>
          {current.message}
        </Text>
        {current.action && (
          <Pressable
            onPress={() => {
              current.action!.onPress();
              hide();
            }}
            accessibilityRole="button"
            style={[styles.action, { paddingHorizontal: space.lg }]}
          >
            <Text variant="button" style={{ color: colors.toastAction }}>
              {current.action.label}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0 },
  card: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  message: { flex: 1, paddingVertical: 12 },
  action: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
});
