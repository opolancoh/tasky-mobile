import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LocalDate } from '@/core/types';
import { useConfirmTask } from '@/data/tasks/mutations';
import type { TaskSummary } from '@/data/tasks/types';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { Pill, Text, useTheme } from '@/shared/ui';

import { Avatar } from './Faces';
import { TaskOrigin } from './TaskOrigin';

export interface TaskRowProps {
  task: TaskSummary;
  /** The profile's today: due labels ("Tomorrow") and overdue in red. */
  today: LocalDate | undefined;
  /** Show the due date in the meta line (lists that mix days). */
  showDue?: boolean;
  onComplete(task: TaskSummary): void;
  onPress?(task: TaskSummary): void;
}

/**
 * A task in a list (collections, tags, Upcoming): round checkbox, the title (2 lines at most, then …), a meta line
 * (its list, or "From Olga" for a task the user sees only as its assignee, D70; due date, steps, repeat, Declined or
 * Invited, then a red flag when important, M44) and the initials of whoever has it at the right, you included, except in
 * the Inbox (M44). A task its assignee completed for the user waits here, ticked, with Confirm (D71). Ticking fills the
 * circle at once; the list refetches after the API answers.
 */
export function TaskRow({ task, today, showDue = false, onComplete, onPress }: TaskRowProps) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const labels = useDateLabels(today);
  const confirm = useConfirmTask();
  const awaiting = task.awaitsConfirmation;
  const [tickedNow, setTicked] = useState(false);
  const ticked = tickedNow || awaiting;
  const overdue = !awaiting && !!task.dueDate && !!today && task.dueDate < today;
  // Whoever has it, you included (M44); none in the Inbox, which is only ever yours.
  const who = task.assignee && !task.collection?.isInbox ? task.assignee : null;

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
              <TaskOrigin collection={task.collection} assignedBy={task.assignedBy} />
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
              {task.assignmentStatus === 'declined' && <Text variant="footnote" color="danger">{t('taskRow.declined')}</Text>}
              {awaiting && <Text variant="footnote" color="success">{t('taskRow.completed')}</Text>}
              {task.invitedEmail && <Text variant="footnote" color="ink3" numberOfLines={1}>{`${t('taskRow.invited')} · ${task.invitedEmail}`}</Text>}
              {task.isImportant && <Feather name="flag" size={12} color={colors.danger} accessibilityLabel={t('taskRow.important')} />}
            </View>
          </View>
          {awaiting && (
            <View style={styles.face}>
              <Pill label={t('taskRow.confirm')} onPress={() => confirm.mutate(task)} disabled={confirm.isPending} />
            </View>
          )}
          {task.invitedEmail && !who && (
            <View accessible accessibilityLabel={`${t('taskRow.invited')} · ${task.invitedEmail}`} style={[styles.face, styles.mail, { backgroundColor: colors.surface2 }]}>
              <Feather name="mail" size={12} color={colors.ink2} />
            </View>
          )}
          {who && (
            <View accessible accessibilityLabel={t('taskRow.assignedTo', { name: who.displayName })} style={styles.face}>
              <Avatar name={who.displayName} seed={who.id} size={22} />
            </View>
          )}
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
  face: { alignSelf: 'center' },
  mail: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
