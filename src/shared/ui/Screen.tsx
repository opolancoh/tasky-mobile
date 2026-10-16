import type { ReactNode, Ref } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useTheme } from './theme';

export interface ScreenProps {
  children: ReactNode;
  /** Scrolls the content; forms also move above the keyboard. */
  scroll?: boolean;
  /** Lifts the content above the keyboard on the UI thread: a list with a field docked at its bottom (M62). Not with `scroll`. */
  followKeyboard?: boolean;
  /** Safe-area edges to pad. Screens under a header or tab bar leave those edges out. */
  edges?: Edge[];
  contentStyle?: ViewStyle;
  /** The scroll view, with `scroll` (e.g. to bring an error at the top into view). */
  scrollRef?: Ref<ScrollView>;
}

/** Every screen's root: background, safe areas, side padding, optional scrolling. */
export function Screen({ children, scroll = false, followKeyboard = false, edges = ['top', 'bottom'], contentStyle, scrollRef }: ScreenProps) {
  const { colors, space } = useTheme();
  const padding = { paddingHorizontal: space.xxl, flexGrow: 1 };

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.bg }]}>
      {scroll ? (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scrollRef} contentContainerStyle={[padding, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : followKeyboard ? (
        <KeyboardRoom bottomPadded={edges.includes('bottom')} style={[padding, contentStyle]}>{children}</KeyboardRoom>
      ) : (
        <View style={[padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/**
 * Leaves the keyboard's height free under the content, as `Sheet` does: a shared value, no re-render. The bottom safe
 * area the screen already pads is taken off, so the content sits right on the keyboard.
 */
function KeyboardRoom({ children, bottomPadded, style }: { children: ReactNode; bottomPadded: boolean; style: (ViewStyle | undefined)[] }) {
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard({ isStatusBarTranslucentAndroid: true, isNavigationBarTranslucentAndroid: true });
  const padded = bottomPadded ? insets.bottom : 0;
  const room = useAnimatedStyle(() => ({ paddingBottom: Math.max(keyboard.height.value - padded, 0) }));
  return <Animated.View style={[styles.root, room]}><View style={style}>{children}</View></Animated.View>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
