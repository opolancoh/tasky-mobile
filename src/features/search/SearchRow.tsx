import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCompleteTask, useReopenTask } from '@/data/tasks/mutations';
import type { TaskSummary } from '@/data/tasks/types';
import { ColorDot, Text, useTheme } from '@/shared/ui';

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
  const done = task.status === 'completed';
  const [checked, setChecked] = useState(done);
  const toggle = () => {
    setChecked(!checked);
    if (done) reopen.mutate(task);
    else complete.mutate(task);
  };
  // The title in pieces: a word that starts with a searched word is bold.
  const parts = task.title.split(/([\p{L}\p{N}]+)/u);
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.md, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
          <Pressable
            onPress={toggle}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={t(done ? 'search.reopen' : 'taskRow.complete', { title: task.title })}
            hitSlop={11}
            style={[styles.check, { borderColor: checked ? colors.accent : colors.ink3, backgroundColor: checked ? colors.accent : 'transparent' }]}
          >
            {checked && <Feather name="check" size={14} color={colors.onAccent} />}
          </Pressable>
          <View style={styles.main}>
            <Text variant="body" numberOfLines={2} color={done ? 'ink3' : 'ink'}>
              {parts.map((p, i) =>
                words.some((w) => fold(p).startsWith(w)) ? <Text key={i} variant="bodyMedium" color={done ? 'ink2' : 'heading'}>{p}</Text> : p,
              )}
            </Text>
            <View style={[styles.meta, { gap: space.xs }]}>
              <ColorDot color={task.collection.color} size={8} />
              <Text variant="footnote" color="ink3" numberOfLines={1} style={styles.shrink}>{task.collection.isInbox ? t('browse.inbox') : task.collection.name}</Text>
              {done && <Text variant="footnote" color="ink3">· {t('search.completed')}</Text>}
            </View>
          </View>
          {task.isImportant && !done && <Feather name="flag" size={16} color={colors.danger} accessibilityLabel={t('taskRow.important')} style={styles.flag} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  main: { flex: 1, minWidth: 0, gap: 3 },
  meta: { flexDirection: 'row', alignItems: 'center' },
  shrink: { flexShrink: 1 },
  flag: { marginTop: 3 },
});
