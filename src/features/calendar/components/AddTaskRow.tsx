import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import type { LocalDate } from '@/core/types';
import { useQuickAdd } from '@/shared/quickAdd/quickAddStore';
import { Text, useTheme } from '@/shared/ui';

/** Add a task under a day's tasks (M72): Quick add due that day. */
export function AddTaskRow({ dueDate }: { dueDate: LocalDate }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const show = useQuickAdd((s) => s.show);
  return (
    <Pressable onPress={() => show('', undefined, dueDate)} accessibilityRole="button" style={({ pressed }) => [styles.add, { gap: space.xs + 2, opacity: pressed ? 0.6 : 1 }]}>
      <Feather name="plus" size={16} color={colors.accent} />
      <Text variant="button" color="accent">{t('calendar.addTask')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({ add: { flexDirection: 'row', alignItems: 'center', minHeight: 44, alignSelf: 'flex-start' } });
