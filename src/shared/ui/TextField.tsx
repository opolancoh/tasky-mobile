import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

export interface TextFieldProps extends TextInputProps {
  label: string;
  /** Shown under the field in red; replaces the hint. */
  error?: string;
  hint?: string;
  /** Hides the text and adds a Show / Hide button with these labels. */
  secureToggle?: { show: string; hide: string };
}

/** Calm style: a label and an underlined input; the line turns accent on focus and red on error. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, secureToggle, onFocus, onBlur, style, ...rest },
  ref,
) {
  const { colors, type, space } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const lineColor = error ? colors.danger : focused ? colors.accent : colors.line;

  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label" color="ink2">
        {label}
      </Text>
      <View style={[styles.row, { borderBottomColor: lineColor, borderBottomWidth: focused || error ? 1.5 : 1 }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          secureTextEntry={secureToggle ? hidden : rest.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          // Font and size only: a lineHeight on an iOS TextInput clips descenders (g, p, @) while editing.
          style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }, style]}
          {...rest}
        />
        {secureToggle && (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setHidden((h) => !h)} style={styles.toggle}>
            <Text variant="label" color="accent" style={{ fontSize: 14 }}>
              {hidden ? secureToggle.show : secureToggle.hide}
            </Text>
          </Pressable>
        )}
      </View>
      {(error || hint) && (
        <Text variant="footnote" color={error ? 'danger' : 'ink3'} accessibilityLiveRegion="polite">
          {error ?? hint}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  input: { flex: 1, paddingVertical: 12, paddingHorizontal: 2 },
  toggle: { paddingLeft: 12, paddingVertical: 8 },
});
