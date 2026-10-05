import { Feather } from '@expo/vector-icons';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedKeyboard, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from './Text';
import { useTheme } from './theme';

/** A header button: text, an icon, or both (icon first, e.g. "‹ Task"). */
export interface SheetAction {
  label?: string;
  icon?: ComponentProps<typeof Feather>['name'];
  onPress(): void;
  /** Semibold, for the action that confirms (Add, Done). */
  emphasis?: boolean;
  disabled?: boolean;
  /** A small spinner in its place while the action runs (M27); not pressable meanwhile. */
  busy?: boolean;
  /** Needed when there is only an icon. */
  accessibilityLabel?: string;
}

export interface SheetProps {
  visible: boolean;
  /** Tapping outside the sheet (unless `onBackdropPress` is set), Android's back button, or the caller's own Cancel. */
  onDismiss(): void;
  /** Tapping outside the sheet, when it should differ from Android's back (e.g. discard a page's changes). */
  onBackdropPress?(): void;
  /** Read by screen readers for the area outside the sheet, e.g. "Close". */
  dismissLabel: string;
  title?: string;
  left?: SheetAction;
  right?: SheetAction;
  children: ReactNode;
  /** Full-width strip under the content on the sheet's own background, kept above the keyboard (e.g. an icon bar). */
  footer?: ReactNode;
}

const DURATION = 220;

/**
 * A bottom sheet over the whole app: a dimmed backdrop that closes it when tapped, a grabber, an
 * optional header (title, left and right actions), the content and an optional footer kept above the
 * keyboard. Always the large size (M28): its top sits just below the status bar on every page and never moves while
 * typing or filtering; the keyboard only lifts its bottom, and the content scrolls inside.
 * Mount it at the app root (after the navigator), like QuickAddSheet: it draws as an overlay,
 * not a native Modal. Opening, closing and following the keyboard run on the UI thread (Reanimated), with
 * no re-render per frame (docs/performance.md). `visible` false plays the closing animation before it leaves.
 */
export function Sheet(props: SheetProps) {
  const [mounted, setMounted] = useState(props.visible);
  if (props.visible && !mounted) setMounted(true);   // opening: mount first, then the panel animates in
  // Mounted only while shown: the keyboard tracking (and, on Android, the window not resizing) lasts as long as the sheet.
  return mounted ? <SheetPanel {...props} onClosed={() => setMounted(false)} /> : null;
}

function SheetPanel({ visible, onDismiss, onBackdropPress, dismissLabel, title, left, right, children, footer, onClosed }: SheetProps & { onClosed(): void }) {
  const { colors, radius, space } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const progress = useSharedValue(0);   // 0 closed → 1 open
  // Keyboard height as a shared value. Expo Go ships Reanimated but not react-native-keyboard-controller, which
  // Reanimated suggests instead; this hook is the Expo Go way. Android: edge-to-edge, so no extra bar margins.
  const keyboard = useAnimatedKeyboard({ isStatusBarTranslucentAndroid: true, isNavigationBarTranslucentAndroid: true });

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: DURATION }, (finished) => {
      if (finished && !visible) scheduleOnRN(onClosed);
    });
  }, [visible, progress, onClosed]);

  // Android's back button acts like the caller's dismiss while the sheet is up.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, onDismiss]);

  // Plain numbers and booleans only inside worklets (they are copied to the UI thread).
  const hasFooter = !!footer;
  const gap = space.lg;
  const safeBottom = insets.bottom;
  const bottomInset = Math.max(safeBottom, gap);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  // The room under the sheet is the keyboard's height; the panel shrinks to what is left above it and its content scrolls.
  const frameStyle = useAnimatedStyle(() => ({ paddingBottom: keyboard.height.value }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [windowHeight, 0]) }],
    paddingBottom: hasFooter ? 0 : keyboard.height.value > 0 ? gap : bottomInset,
  }));
  const footerStyle = useAnimatedStyle(() => ({ paddingBottom: keyboard.height.value > 0 ? 0 : safeBottom }));
  const hasHeader = !!(title || left || right);

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, backdropStyle]}>
        <Pressable style={styles.fill} onPress={onBackdropPress ?? onDismiss} accessibilityRole="button" accessibilityLabel={dismissLabel} />
      </Animated.View>

      <Animated.View style={[styles.frame, { paddingTop: insets.top + space.sm }, frameStyle]} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.panel,
            { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space.lg },
            panelStyle,
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.line, marginVertical: space.sm }]} />
          {hasHeader && (
            <View style={styles.header}>
              <View style={styles.side}>{left && <HeaderAction action={left} />}</View>
              <Text variant="headline" numberOfLines={1} accessibilityRole="header" style={styles.title}>
                {title ?? ''}
              </Text>
              <View style={[styles.side, styles.end]}>{right && <HeaderAction action={right} />}</View>
            </View>
          )}
          <View style={styles.fill}>{children}</View>
          {footer && <Animated.View style={[{ marginHorizontal: -space.lg }, footerStyle]}>{footer}</Animated.View>}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function HeaderAction({ action }: { action: SheetAction }) {
  const { colors, type } = useTheme();
  const { label, icon, onPress, emphasis, disabled, busy, accessibilityLabel } = action;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      hitSlop={8}
      style={styles.action}
    >
      {({ pressed }) => {
        const color = disabled ? colors.ink3 : pressed ? colors.accentPressed : colors.accent;
        if (busy) return <ActivityIndicator size="small" color={colors.accent} />;
        return (
          <>
            {icon && <Feather name={icon} size={label ? 24 : 22} color={color} style={label ? styles.iconWithLabel : undefined} />}
            {label && <Text style={[emphasis ? type.button : type.body, { color }]}>{label}</Text>}
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  /** Fills the screen below the status bar and above the keyboard. */
  frame: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  /** The large size (M28): the panel fills the frame, whatever its content. */
  panel: { width: '100%', flex: 1 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  /** 44 pt tall: every action is a full touch target (HIG). */
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: 4 },
  side: { flex: 1, flexDirection: 'row' },
  end: { justifyContent: 'flex-end' },
  title: { flexShrink: 1, textAlign: 'center', paddingHorizontal: 8 },
  action: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center' },
  iconWithLabel: { marginLeft: -6 },
});
