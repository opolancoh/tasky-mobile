import { Feather } from '@expo/vector-icons';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Animated, Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
 * A bottom sheet over the current screen: a dimmed backdrop that closes it when tapped, a grabber, an
 * optional header (title, left and right actions), and the content. It rises above the keyboard.
 * `visible` false plays the closing animation before the sheet leaves.
 */
export function Sheet({ visible, onDismiss, onBackdropPress, dismissLabel, title, left, right, children, footer }: SheetProps) {
  const { colors, radius, space } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));   // 0 closed → 1 open

  if (visible && !mounted) setMounted(true);   // opening: mount first, then the effect animates in

  useEffect(() => {
    Animated.timing(progress, { toValue: visible ? 1 : 0, duration: DURATION, useNativeDriver: true }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, progress]);

  const keyboard = useKeyboardHeight();
  const offscreen = Dimensions.get('window').height;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offscreen, 0] });
  const hasHeader = !!(title || left || right);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: progress }]}>
        <Pressable style={styles.fill} onPress={onBackdropPress ?? onDismiss} accessibilityRole="button" accessibilityLabel={dismissLabel} />
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingHorizontal: space.lg,
              paddingBottom: footer ? 0 : keyboard > 0 ? space.lg : Math.max(insets.bottom, space.lg),
              maxHeight: offscreen - keyboard - insets.top - space.sm,   // never taller than the room above the keyboard; the content scrolls
              transform: [{ translateY }],
            },
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
          {children}
          {footer && <View style={{ marginHorizontal: -space.lg, paddingBottom: keyboard > 0 ? 0 : insets.bottom }}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The keyboard's height while it's open, 0 otherwise. */
function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    if (!ios) return;   // Android resizes the window for the keyboard itself
    const show = Keyboard.addListener('keyboardWillShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

function HeaderAction({ action }: { action: SheetAction }) {
  const { colors, type } = useTheme();
  const { label, icon, onPress, emphasis, disabled, accessibilityLabel } = action;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={8}
      style={styles.action}
    >
      {({ pressed }) => {
        const color = disabled ? colors.ink3 : pressed ? colors.accentPressed : colors.accent;
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
  bottom: { flex: 1, justifyContent: 'flex-end' },
  panel: { width: '100%' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  /** 44 pt tall: every action is a full touch target (HIG). */
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: 4 },
  side: { flex: 1, flexDirection: 'row' },
  end: { justifyContent: 'flex-end' },
  title: { flexShrink: 1, textAlign: 'center', paddingHorizontal: 8 },
  action: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center' },
  iconWithLabel: { marginLeft: -6 },
});
