import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { useDelayedFlag } from './useDelayedFlag';

export interface TextButtonProps {
  label: string;
  onPress(): void;
  /** accent: the main action (Save, Invite) · quiet: a secondary one in a row (Revoke). */
  tone?: 'accent' | 'quiet';
  disabled?: boolean;
  /** Saving (M56): disabled and busy for screen readers at once; the label turns into a spinner after 300 ms. */
  busy?: boolean;
  accessibilityLabel?: string;
}

/** A text-only action in a header or beside a field or row. 44 pt touch target (HIG); keeps its width while busy. */
export function TextButton({ label, onPress, tone = 'accent', disabled, busy = false, accessibilityLabel }: TextButtonProps) {
  const { colors } = useTheme();
  const spinner = useDelayedFlag(busy);
  const inactive = !!disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy }}
      style={styles.button}
    >
      {({ pressed }) => (
        <View style={styles.center}>
          <Text
            variant={tone === 'accent' ? 'button' : 'label'}
            color={inactive && !spinner ? 'ink3' : tone === 'accent' ? 'accent' : 'ink2'}
            style={{ opacity: spinner ? 0 : pressed ? 0.6 : 1 }}
          >
            {label}
          </Text>
          {spinner && <ActivityIndicator size="small" color={colors.ink3} style={StyleSheet.absoluteFill} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  center: { justifyContent: 'center' },
});
