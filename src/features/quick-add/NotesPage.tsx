import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput } from 'react-native';

import { taskLimits } from '@/data/tasks/types';
import { useTheme } from '@/shared/ui';

/** Notes as a page of the sheet: plain text, full height, keyboard up, applied as typed (no Done). */
export function NotesPage({ value, onChange }: { value: string; onChange(notes: string): void }) {
  const { t } = useTranslation();
  const { colors, type } = useTheme();
  const [selection, setSelection] = useState({ start: value.length, end: value.length });   // caret at the end
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      selection={selection}
      onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
      placeholder={t('quickAdd.notesPlaceholder')}
      placeholderTextColor={colors.ink3}
      selectionColor={colors.accent}
      accessibilityLabel={t('quickAdd.fields.notes')}
      autoFocus
      multiline
      maxLength={taskLimits.notesMax}
      textAlignVertical="top"
      style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }]}
    />
  );
}

const styles = StyleSheet.create({
  /** No lineHeight (it clips descenders on iOS). */
  input: { height: 260, padding: 0, paddingTop: 4 },
});
