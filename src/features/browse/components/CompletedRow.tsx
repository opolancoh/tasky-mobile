import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useReopenTask } from '@/data/tasks/mutations';
import type { TaskSummary } from '@/data/tasks/types';
import { ColorDot, Text, useTheme } from '@/shared/ui';

/** A completed task in a list: the filled circle reopens it; the title struck through, its list under it. */
export function CompletedRow({ task, onPress }: { task: TaskSummary; onPress(): void }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const reopen = useReopenTask();
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.md, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
          <Pressable
            onPress={() => { setOpen(true); reopen.mutate(task); }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !open }}
            accessibilityLabel={t('browse.reopen', { title: task.title })}
            hitSlop={11}
            style={[styles.check, { borderColor: open ? colors.ink3 : colors.accent, backgroundColor: open ? 'transparent' : colors.accent }]}
          >
            {!open && <Feather name="check" size={14} color={colors.onAccent} />}
          </Pressable>
          <View style={styles.main}>
            <Text variant="bodyMedium" color="ink3" numberOfLines={2} style={styles.done}>{task.title}</Text>
            <View style={[styles.meta, { gap: space.xs }]}>
              <ColorDot color={task.collection.color} size={8} />
              <Text variant="footnote" color="ink3" numberOfLines={1}>{task.collection.name}</Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  main: { flex: 1, minWidth: 0, gap: 3 },
  done: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center' },
});
