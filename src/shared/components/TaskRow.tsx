import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LocalDate } from '@/core/types';
import { useConfirmTask } from '@/data/tasks/mutations';
import type { TaskSummary } from '@/data/tasks/types';
import { useHoldActions } from '@/shared/hold/useHoldActions';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { SelectCheck } from '@/shared/selection/SelectCheck';
import { selectable as canSelect, useRowSelection, useSelection } from '@/shared/selection/selectionStore';
import { useSessionStore } from '@/shared/session/sessionStore';
import { Pill, Text, useTheme } from '@/shared/ui';

import { Avatar } from './Faces';
import { TaskOrigin } from './TaskOrigin';
import { CheckCircle } from './CheckCircle';
import { easeNextLayout, useTaskCheck } from './useTaskCheck';

export interface TaskRowProps {
  task: TaskSummary;
  /** The profile's today: due labels ("Tomorrow") and overdue in red. */
  today: LocalDate | undefined;
  /** Show the due date in the meta line (lists that mix days). */
  showDue?: boolean;
  /** Off on a list's own screen: its name is already the title (M57). */
  showList?: boolean;
  /** Assigned by me (M71): Pending too, and why it was declined. */
  showAssignment?: boolean;
  /** The assignee doesn't see its shared list: they have only this task (D88, M71). */
  outside?: boolean;
  /** Hide the initials at the right (a list grouped by person). */
  hideFace?: boolean;
  /** A list that selects (M81): a long press starts selecting; while selecting, a tap picks the task. */
  selectable?: boolean;
  onComplete(task: TaskSummary): void;
  onPress?(task: TaskSummary): void;
}

/**
 * A task in a list (task lists, tags, Upcoming): round checkbox, the title (2 lines at most, then …), a meta line
 * (its list unless `showList` is off, M57, or "From Olga" for a task the user sees only as its assignee, D70; due date, steps, repeat, Declined or
 * Invited, then a red flag when important, M44) and the initials of whoever has it at the right, you included, except
 * yours in the Inbox (M44; someone given a task from it shows, D88). A task its assignee completed for the user waits here, ticked, with Confirm (D71). Ticking fills the
 * row into Completed at once, its circle spinning until the answer, and back if the API says no (M75). On hold (D91, M80): a
 * pause icon instead of the circle (Resume, Complete, Edit the reason), an "On hold · reason" chip, until when and who can
 * resume it, never overdue. Bulk actions (M81, `selectable`): a long press starts selecting (Put on hold moved to the
 * selection bar); while selecting, the circle is a round check, a tap picks or drops the task and the picked row tints;
 * completed tasks can't be picked.
 */
export function TaskRow({ task, today, showDue = false, showList = true, showAssignment = false, outside = false, hideFace = false, selectable = false, onComplete, onPress }: TaskRowProps) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const labels = useDateLabels(today);
  const confirm = useConfirmTask();
  const awaiting = task.awaitsConfirmation;
  const check = useTaskCheck(task, onComplete);
  const ticked = awaiting;
  const held = task.status === 'onHold';
  const holds = useHoldActions();
  const selection = useRowSelection(task.id);
  const selecting = selectable && selection.selecting;
  const pickable = selectable && canSelect(task);
  const pick = () => useSelection.getState().toggle(task);
  const startSelecting = () => useSelection.getState().start(selection.key, task);
  const overdue = !awaiting && !held && !!task.dueDate && !!today && task.dueDate < today;
  const meId = useSessionStore((s) => s.userId);
  // Whoever has it, you included (M44); not you in the Inbox, which is only ever yours (someone given a task from it, D88).
  const who = task.assignee && !hideFace && !(task.taskList?.isInbox && task.assignee.id === meId) ? task.assignee : null;

  const complete = () => {
    if (!awaiting) check.tap();
  };

  return (
    <Pressable
      onPress={selecting ? (pickable ? pick : undefined) : onPress ? () => onPress(task) : undefined}
      onLongPress={!selecting && pickable ? startSelecting : undefined}
      disabled={selecting ? !pickable : (!onPress && !pickable) || check.saving}
      accessibilityRole={selecting ? 'checkbox' : onPress ? 'button' : undefined}
      accessibilityState={selecting ? { checked: selection.picked, disabled: !pickable } : { busy: check.saving }}
      accessibilityActions={!selecting && pickable ? [{ name: 'longpress', label: t('select.selectTasks') }] : undefined}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && startSelecting()}
    >
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.md, backgroundColor: selection.picked && selecting ? colors.accentSoft : pressed ? colors.surface2 : 'transparent', opacity: selecting && !pickable ? 0.4 : 1 }]}>
          {selecting && pickable ? (
            <SelectCheck picked={selection.picked} />
          ) : held ? (
            <Pressable onPress={() => holds.heldMenu(task)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('hold.menuLabel', { title: task.title })} style={styles.pause}>
              <Feather name="pause-circle" size={22} color={colors.warn} />
            </Pressable>
          ) : (
            <CheckCircle checked={ticked} saving={check.saving} onPress={complete} label={t('taskRow.complete', { title: task.title })} />
          )}
          <View style={styles.main}>
            <Text variant="bodyMedium" numberOfLines={2} style={ticked ? { color: colors.ink3 } : undefined}>
              {task.title}
            </Text>
            <View style={[styles.meta, { gap: space.sm }]}>
              {held && (
                <View style={[styles.chip, { backgroundColor: colors.warnSoft }]}>
                  <Text variant="caption" style={{ color: colors.warn }} numberOfLines={1}>{task.holdReason ? t('hold.chip', { reason: task.holdReason }) : t('hold.onHold')}</Text>
                </View>
              )}
              {held && task.holdUntil && <Text variant="footnote" color="ink3">{t('hold.untilShort', { date: labels.day(task.holdUntil) })}</Text>}
              {held && task.resumer && <Text variant="footnote" color="ink3" numberOfLines={1}>{task.resumer.id === meId ? t('hold.youResume') : t('hold.canResume', { name: task.resumer.displayName.split(' ')[0] })}</Text>}
              {showList && <TaskOrigin taskList={task.taskList} assignedBy={task.assignedBy} />}
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
              {showAssignment && task.assignmentStatus === 'pending' && <Text variant="footnote" style={{ color: colors.warn }}>{t('taskRow.pending')}</Text>}
              {task.assignmentStatus === 'declined' && (
                <Text variant="footnote" color="danger" numberOfLines={2}>{showAssignment && task.declineReason ? t('taskRow.declinedReason', { reason: task.declineReason }) : t('taskRow.declined')}</Text>
              )}
              {outside && <Text variant="footnote" color="ink3">{t('taskRow.outsideList')}</Text>}
              {awaiting && <Text variant="footnote" color="success">{t('taskRow.completed')}</Text>}
              {task.invitedEmail && <Text variant="footnote" color="ink3" numberOfLines={1}>{`${t('taskRow.invited')} · ${task.invitedEmail}`}</Text>}
              {task.isImportant && <Feather name="flag" size={12} color={colors.danger} accessibilityLabel={t('taskRow.important')} />}
            </View>
          </View>
          {awaiting && (
            <View style={styles.face}>
              <Pill label={t('taskRow.confirm')} onPress={() => { easeNextLayout(); confirm.mutate(task); }} disabled={confirm.isPending || check.saving || selecting} />
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
  main: { flex: 1, minWidth: 0, gap: 3 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  face: { alignSelf: 'center' },
  mail: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pause: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, maxWidth: '100%' },
});
