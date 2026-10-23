import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useTheme } from './theme';

export interface ScreenProps {
  children: ReactNode;
  /** Scrolls the content; it (and `footer`) ends right above the keyboard, on the UI thread. */
  scroll?: boolean;
  /** Safe-area edges to pad. Screens under a header or tab bar leave those edges out. */
  edges?: Edge[];
  contentStyle?: ViewStyle;
  /** The scroll view, with `scroll` (e.g. to bring an error at the top into view). */
  scrollRef?: Ref<ScrollView>;
  /** With `scroll`: docked under the scrolling content, full width, above the keyboard (Task detail's comment field, M82). */
  footer?: ReactNode;
}

/** Every screen's root: background, safe areas, side padding, optional scrolling. */
export function Screen({ children, scroll = false, edges = ['top', 'bottom'], contentStyle, scrollRef, footer }: ScreenProps) {
  const { colors, space } = useTheme();
  const padding = { paddingHorizontal: space.xxl, flexGrow: 1 };

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.bg }]}>
      {scroll ? (
        <KeyboardRoom bottomPadded={edges.includes('bottom')}>
          <ScrollView ref={scrollRef} contentContainerStyle={[padding, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer}
        </KeyboardRoom>
      ) : (
        <View style={[padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/**
 * Leaves the keyboard's height free under the content, as `Sheet` does: a shared value, no re-render. The bottom safe
 * area the screen already pads is taken off, so the content sits right on the keyboard. Measured from the screen's
 * bottom, so a header above needs no offset, and it works on Android edge-to-edge, where the window no longer resizes
 * (React Native's KeyboardAvoidingView missed the header on iOS and did nothing on Android).
 */
function KeyboardRoom({ children, bottomPadded }: { children: ReactNode; bottomPadded: boolean }) {
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard({ isStatusBarTranslucentAndroid: true, isNavigationBarTranslucentAndroid: true });
  const padded = bottomPadded ? insets.bottom : 0;
  const room = useAnimatedStyle(() => ({ paddingBottom: Math.max(keyboard.height.value - padded, 0) }));
  return <Animated.View style={[styles.root, room]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
