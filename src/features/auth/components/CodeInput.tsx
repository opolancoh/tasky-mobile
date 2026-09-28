import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { fonts, Text, useTheme } from '@/shared/ui';

interface CodeInputProps {
  value: string;
  onChange(value: string): void;
  length: number;
  hasError?: boolean;
  onFilled?(code: string): void;
  accessibilityLabel: string;
}

/**
 * One cell per digit over a single hidden input, so paste and the iOS "From Messages / Mail"
 * suggestion fill every cell at once.
 */
export function CodeInput({ value, onChange, length, hasError, onFilled, accessibilityLabel }: CodeInputProps) {
  const { colors, radius } = useTheme();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(true);

  function change(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onFilled?.(digits);
  }

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false}>
      <View style={styles.cells}>
        {Array.from({ length }, (_, i) => {
          const current = focused && i === Math.min(value.length, length - 1) && value.length < length;
          const border = hasError ? colors.danger : current ? colors.accent : colors.line;
          return (
            <View key={i} style={[styles.cell, { borderBottomColor: border, borderBottomWidth: current || hasError ? 2 : 1.5, borderRadius: radius.sm }]}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 26, lineHeight: 34, color: colors.ink }}>{value[i] ?? ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={change}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        caretHidden
        accessibilityLabel={accessibilityLabel}
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cells: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, height: 58, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
