import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  /** primary: filled accent · link: accent text only */
  variant?: 'primary' | 'link';
  loading?: boolean;
}

export function Button({ title, variant = 'primary', loading = false, disabled, ...rest }: ButtonProps) {
  const { colors, radius, type } = useTheme();
  const inactive = disabled || loading;

  if (variant === 'link') {
    return (
      <Pressable accessibilityRole="button" disabled={inactive} style={styles.link} {...rest}>
        {({ pressed }) => (
          <Text variant="label" style={{ fontSize: 14, color: pressed ? colors.accentPressed : colors.accent }}>
            {title}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.primary,
        {
          borderRadius: radius.lg,
          backgroundColor: disabled ? colors.accentDisabled : pressed ? colors.accentPressed : colors.accent,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={[type.button, { color: disabled ? colors.onAccentDisabled : colors.onAccent }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** 44 pt tall touch target (HIG), however short the label. */
  link: { minHeight: 44, justifyContent: 'center' },
  primary: { height: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
});
