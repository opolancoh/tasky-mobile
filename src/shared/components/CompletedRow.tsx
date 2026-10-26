import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useReopenTask } from '@/data/tasks/mutations';
import type { TaskSummary } from '@/data/tasks/types';
import { CheckCircle, TaskOrigin, useTaskCheck } from '@/shared/components';
import { Text, useTheme } from '@/shared/ui';

/**
 * A completed task in a list: the filled circle reopens it (the row leaves Completed at once, M75); a task just completed
 * lands here with its circle spinning until the answer; the title struck through, its list under it (not on the list's own screen).
 */
export function CompletedRow({ task, onPress, showList = true }: { task: TaskSummary; onPress(): void; /** Off on a list's own screen (M57). */ showList?: boolean }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const reopen = useReopenTask();
  const { saving, tap } = useTaskCheck(task, (x) => reopen.mutate(x));
  return (
    <Pressable onPress={onPress} disabled={saving} accessibilityRole="button" accessibilityState={{ busy: saving }}>
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.md, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
          <CheckCircle checked saving={saving} onPress={tap} label={t('browse.reopen', { title: task.title })} />
          <View style={styles.main}>
            <Text variant="bodyMedium" color="ink3" numberOfLines={2} style={styles.done}>{task.title}</Text>
            {showList && (
              <View style={[styles.meta, { gap: space.xs }]}>
                <TaskOrigin taskList={task.taskList} assignedBy={task.assignedBy} />
              </View>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0, gap: 3 },
  done: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center' },
});
