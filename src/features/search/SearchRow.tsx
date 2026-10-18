import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCompleteTask, useReopenTask } from '@/data/tasks/mutations';
import type { TaskSummary } from '@/data/tasks/types';
import { CheckCircle, TaskOrigin, useTaskCheck } from '@/shared/components';
import { Text, useTheme } from '@/shared/ui';

/** Lower case without accents, so "Café" matches "cafe" (the API ignores both). */
const fold = (s: string) => s.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

/** The query's words, folded, for bolding the matches. */
export const searchWords = (q: string) => fold(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * A search result (M40): the circle (completes an open task; a completed one shows its check and reopens), the title with
 * the words found in bold, its list, and "Completed" for a completed one.
 */
export function SearchRow({ task, words, onPress }: { task: TaskSummary; words: string[]; onPress(): void }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const complete = useCompleteTask();
  const reopen = useReopenTask();
  // The circle follows the task: the toggle changes it in the search results at once (M75), and back if the API says no.
  const done = task.status === 'completed';
  const { saving, tap: toggle } = useTaskCheck(task, (x) => (x.status === 'completed' ? reopen.mutate(x) : complete.mutate(x)));
  // The title in pieces: a word that starts with a searched word is bold.
  const parts = task.title.split(/([\p{L}\p{N}]+)/u);
  return (
    <Pressable onPress={onPress} disabled={saving} accessibilityRole="button" accessibilityState={{ busy: saving }}>
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.md, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
          <CheckCircle checked={done} saving={saving} onPress={toggle} label={t(done ? 'search.reopen' : 'taskRow.complete', { title: task.title })} />
          <View style={styles.main}>
            <Text variant="body" numberOfLines={2} color={done ? 'ink3' : 'ink'}>
              {parts.map((p, i) =>
                words.some((w) => fold(p).startsWith(w)) ? <Text key={i} variant="bodyMedium" color={done ? 'ink2' : 'heading'}>{p}</Text> : p,
              )}
            </Text>
            <View style={[styles.meta, { gap: space.xs }]}>
              <TaskOrigin taskList={task.taskList} assignedBy={task.assignedBy} />
              {done && <Text variant="footnote" color="ink3">· {t('search.completed')}</Text>}
              {task.isImportant && !done && <Feather name="flag" size={12} color={colors.danger} accessibilityLabel={t('taskRow.important')} style={styles.flag} />}
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0, gap: 3 },
  meta: { flexDirection: 'row', alignItems: 'center' },
  shrink: { flexShrink: 1 },
  flag: { marginLeft: 6 },   // important: the last item of the meta line (M44)
});
