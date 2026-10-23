import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Id } from '@/core/types';
import { useQuickAdd } from '@/shared/quickAdd/quickAddStore';
import { radius, Text, useTheme } from '@/shared/ui';

/**
 * A list's Add a task (M103, the hub's option D; replaces M62's field): docked at the bottom, a field-like capsule that
 * floats over the background with a shadow and an accent + at its start. A tap opens Quick add on this list, the same
 * sheet as the + (M14); Add there closes it and the task is in the list at once (M100).
 */
export function AddTaskButton({ taskListId, listName, onAdded }: { taskListId: Id; listName: string; onAdded(): void }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const show = useQuickAdd((s) => s.show);

  return (
    <View style={{ paddingVertical: space.sm, marginHorizontal: space.lg - space.xxl }}>
      <Pressable
        onPress={() => show({ taskListId, onAdded })}
        accessibilityRole="button"
        accessibilityLabel={t('browse.addTaskTo', { name: listName })}
        style={({ pressed }) => [styles.capsule, { gap: space.sm, backgroundColor: pressed ? colors.surface2 : colors.surface, borderColor: colors.line, shadowColor: colors.ink }]}
      >
        <View style={[styles.plus, { backgroundColor: colors.accent }]}>
          <Feather name="plus" size={18} color={colors.onAccent} />
        </View>
        <Text variant="body" color="ink3">{t('browse.addTask')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingLeft: 6,
    paddingRight: 16,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  plus: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
