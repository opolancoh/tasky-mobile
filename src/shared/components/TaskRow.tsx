import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LocalDate } from '@/core/types';
import type { Collection, TaskSummary } from '@/data/tasks/types';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { ColorDot, Text, useTheme } from '@/shared/ui';

export interface TaskRowProps {
  task: TaskSummary;
  collection: Collection | undefined;
  /** The profile's today: due labels ("Tomorrow") and overdue in red. */
  today: LocalDate | undefined;
  /** Show the due date in the meta line (lists that mix days). */
  showDue?: boolean;
  onComplete(task: TaskSummary): void;
  onPress?(task: TaskSummary): void;
}

/**
 * A task in a list (Home, Today, collections): round checkbox, the title (2 lines at most, then …), a meta line
 * (collection, due date, steps) and a red flag when important. Ticking fills the circle at once; the list
 * refetches after the API answers.
 */
export function TaskRow({ task, collection, today, showDue = false, onComplete, onPress }: TaskRowProps) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const labels = useDateLabels(today);
  const [ticked, setTicked] = useState(false);
  const overdue = !!task.dueDate && !!today && task.dueDate < today;

  const complete = () => {
    if (ticked) return;
    setTicked(true);
    onComplete(task);
  };

  return (
    <Pressable onPress={onPress ? () => onPress(task) : undefined} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.md, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
          <Pressable
            onPress={complete}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ticked }}
            accessibilityLabel={t('taskRow.complete', { title: task.title })}
            hitSlop={11}
            style={[styles.check, { borderColor: ticked ? colors.accent : colors.ink3, backgroundColor: ticked ? colors.accent : 'transparent' }]}
          >
            {ticked && <Feather name="check" size={14} color={colors.onAccent} />}
          </Pressable>
          <View style={styles.main}>
            <Text variant="bodyMedium" numberOfLines={2} style={ticked ? { color: colors.ink3 } : undefined}>
              {task.title}
            </Text>
            <View style={[styles.meta, { gap: space.sm }]}>
              {collection && (
                <View style={[styles.metaItem, { gap: space.xs }]}>
                  <ColorDot color={collection.color} size={8} />
                  <Text variant="footnote" color="ink3" numberOfLines={1}>
                    {collection.name}
                  </Text>
                </View>
              )}
              {task.dueDate && (showDue || overdue) && (
                <Text variant="footnote" color={overdue ? 'danger' : 'ink3'}>
                  {labels.day(task.dueDate)}
                </Text>
              )}
              {task.stepsTotal > 0 && (
                <Text variant="footnote" color="ink3">
                  {t('taskRow.steps', { done: task.stepsDone, total: task.stepsTotal })}
                </Text>
              )}
              {task.repeats && <Feather name="repeat" size={12} color={colors.ink3} />}
            </View>
          </View>
          {task.isImportant && <Feather name="flag" size={16} color={colors.danger} accessibilityLabel={t('taskRow.important')} style={styles.flag} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  main: { flex: 1, minWidth: 0, gap: 3 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  flag: { marginTop: 3 },
});
