import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Spinner } from './Spinner';
import { useTheme } from './theme';

export interface SearchFieldProps {
  value: string;
  onChangeText(value: string): void;
  placeholder: string;
  /** Label of the ✕ that empties the field. */
  clearLabel: string;
  onSubmit?(): void;
  maxLength?: number;
  /** A search on its way: a small ring in place of the magnifier. */
  busy?: boolean;
  busyLabel?: string;
}

/** A rounded search box: magnifier (a spinning ring while `busy`), text, ✕ when there is text. 44 pt tall. */
export function SearchField({ value, onChangeText, placeholder, clearLabel, onSubmit, maxLength, busy = false, busyLabel }: SearchFieldProps) {
  const { colors, radius, space, type } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: colors.surface2, borderRadius: radius.md, paddingHorizontal: space.md, gap: space.sm }]}>
      {busy ? <Spinner size={16} accessibilityLabel={busyLabel} style={styles.spin} /> : <Feather name="search" size={18} color={colors.ink3} />}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.ink3}
        selectionColor={colors.accent}
        accessibilityLabel={placeholder}
        maxLength={maxLength}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }]}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel={clearLabel} hitSlop={12}>
          <Feather name="x-circle" size={18} color={colors.ink3} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  spin: { marginHorizontal: 1 },
  box: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  input: { flex: 1, paddingVertical: 8 },
});
