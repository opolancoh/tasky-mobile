import { Feather } from '@expo/vector-icons';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LocalDate } from '@/core/types';
import { useConfirmTask } from '@/data/tasks/mutations';
import type { TaskSummary } from '@/data/tasks/types';
import { useHoldActions } from '@/shared/hold/useHoldActions';
import { useReminderSheet } from '@/shared/quickAdd/reminderSheetStore';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { SelectCheck } from '@/shared/selection/SelectCheck';
import { selectable as canSelect, useRowSelection, useSelection } from '@/shared/selection/selectionStore';
import { useSessionStore } from '@/shared/session/sessionStore';
import { Pill, Text, useTheme } from '@/shared/ui';

import { Avatar } from './Faces';
import { ReminderIcon } from './ReminderIcon';
import { SnoozePill } from './SnoozePill';
import { TaskOrigin } from './TaskOrigin';
import { CheckCircle } from './CheckCircle';
import { easeNextLayout, useTaskCheck } from './useTaskCheck';

export interface TaskRowProps {
  task: TaskSummary;
  /** The profile's today: due labels ("Tomorrow") and overdue in red. */
  today: LocalDate | undefined;
  /** Show the due date in the meta line (lists that mix days). */
  showDue?: boolean;
  /** Today (M105): the user's reminder time today in the when slot, not the date. */
  showTime?: boolean;
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
  /** One action at the right, after the flag and face (Overdue's Today). */
  action?: ReactNode;
  onComplete(task: TaskSummary): void;
  onPress?(task: TaskSummary): void;
}

/**
 * A task in any list (06-mobile.md, HIG rules: every task row): round checkbox, the title (2 lines at most), the meta line
 * (`TaskMeta`), then at the right a red flag when important (M44), the initials of whoever has it, you included, except yours
 * in the Inbox (M44, D88), and at most one action (`action`, or Confirm on a task its assignee completed for the user, D71).
 * Ticking moves the row into Completed at once, its circle spinning until the answer, and back if the API says no (M75).
 * On hold (D91, M80): a pause icon instead of the circle (Resume, Complete, Edit the reason). Bulk actions (M81, `selectable`):
 * a long press starts selecting; while selecting, the circle is a round check, a tap picks or drops the task and the picked
 * row tints; completed tasks can't be picked. A reminder (D110, M114) opens the Reminder sheet and is never picked.
 */
export function TaskRow({ task, today, showDue = false, showTime = false, showList = true, showAssignment = false, outside = false, hideFace = false, selectable = false, action, onComplete, onPress }: TaskRowProps) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const confirm = useConfirmTask();
  const awaiting = task.awaitsConfirmation;
  const check = useTaskCheck(task, onComplete);
  const ticked = awaiting;
  const held = task.status === 'onHold';
  const holds = useHoldActions();
  const selection = useRowSelection(task.id);
  const selecting = selectable && selection.selecting;
  const reminder = task.kind === 'reminder';
  const pickable = selectable && canSelect(task) && !reminder;
  const press = reminder ? () => useReminderSheet.getState().show(task.id) : onPress ? () => onPress(task) : undefined;
  const rang = reminder && task.status === 'open' && !!today && !!task.reminder && task.reminder.date < today && !task.reminder.snoozedUntil;
  const end = action ?? (rang ? <SnoozePill taskId={task.id} /> : undefined);
  const pick = () => useSelection.getState().toggle(task);
  const startSelecting = () => useSelection.getState().start(selection.key, task);

  const complete = () => {
    if (!awaiting) check.tap();
  };

  return (
    <Pressable
      onPress={selecting ? (pickable ? pick : undefined) : press}
      onLongPress={!selecting && pickable ? startSelecting : undefined}
      disabled={selecting ? !pickable : (!press && !pickable) || check.saving}
      accessibilityRole={selecting ? 'checkbox' : press ? 'button' : undefined}
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
            <CheckCircle checked={ticked} saving={check.spinning} onPress={complete} label={t('taskRow.complete', { title: task.title })} />
          )}
          <View style={styles.main}>
            <Text variant="bodyMedium" numberOfLines={2} style={ticked ? { color: colors.ink3 } : undefined}>
              {task.title}
            </Text>
            <TaskMeta task={task} today={today} showDue={showDue} showTime={showTime} showList={showList} showAssignment={showAssignment} outside={outside} />
          </View>
          <TaskMarks task={task} hideFace={hideFace} />
          {awaiting ? (
            <View style={styles.end}>
              <Pill label={t('taskRow.confirm')} onPress={() => { easeNextLayout(); confirm.mutate(task); }} disabled={confirm.isPending || check.saving || selecting} />
            </View>
          ) : end && !selecting ? (
            <View style={styles.end} pointerEvents={check.saving ? 'none' : 'auto'}>{end}</View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

/**
 * A task's line under its title, the same in every list, parts joined by "·": where (its list, or "From Olga" for a task
 * the user sees only as its assignee, D70; off on a list's own screen, M57), when (today's reminder time on Today, else the
 * due date, red when late; on hold the "On hold · reason" chip, until when and who resumes it, never late, D91), progress
 * (steps, comments M82, repeat), then the assignment (Pending, Declined and why, outside its list D88, Completed, Invited).
 * A reminder (D110, M114): a bell and its time ("Wed, Oct 7, 9:00 AM"), "Rang …" in amber once its day passed, or "Snoozed
 * until …"; never its list (Personal, where it doesn't show).
 */
export function TaskMeta({ task, today, showDue = false, showTime = false, showList = true, showAssignment = false, outside = false }: Pick<TaskRowProps, 'task' | 'today' | 'showDue' | 'showTime' | 'showList' | 'showAssignment' | 'outside'>) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const labels = useDateLabels(today);
  const meId = useSessionStore((s) => s.userId);
  const awaiting = task.awaitsConfirmation;
  const held = task.status === 'onHold';
  const overdue = !awaiting && !held && task.status !== 'completed' && !!task.dueDate && !!today && task.dueDate < today;
  const isReminder = task.kind === 'reminder' && !!task.reminder;
  const time = !isReminder && showTime && !!today && task.reminder?.date === today ? task.reminder.time : null;
  const rang = isReminder && task.status === 'open' && !!today && task.reminder!.date < today;
  const snoozed = isReminder && task.reminder!.snoozedUntil;
  const when = isReminder ? `${task.reminder!.date === today ? '' : `${labels.day(task.reminder!.date)}, `}${labels.time(task.reminder!.time)}` : '';
  const note = (text: string, color?: 'danger' | 'success') => <Text variant="footnote" color={color ?? 'ink3'} numberOfLines={1}>{text}</Text>;
  const parts: ReactNode[] = [
    showList && !isReminder && <TaskOrigin taskList={task.taskList} assignedBy={task.assignedBy} />,
    isReminder && (
      <View style={[styles.count, { gap: 3 }]}>
        <ReminderIcon size={12} color={rang ? colors.warn : colors.accent} />
        <Text variant="footnote" style={{ color: rang ? colors.warn : colors.accent, fontWeight: '600' }} numberOfLines={1}>
          {snoozed ? t('reminders.snoozed', { time: labels.time(snoozed.slice(11, 16)) }) : rang ? t('reminders.rang', { when }) : when}
        </Text>
      </View>
    ),
    held && (
      <View style={[styles.chip, { backgroundColor: colors.warnSoft }]}>
        <Text variant="caption" style={{ color: colors.warn }} numberOfLines={1}>{task.holdReason ? t('hold.chip', { reason: task.holdReason }) : t('hold.onHold')}</Text>
      </View>
    ),
    held && task.holdUntil && note(t('hold.untilShort', { date: labels.day(task.holdUntil) })),
    held && task.resumer && note(task.resumer.id === meId ? t('hold.youResume') : t('hold.canResume', { name: task.resumer.displayName.split(' ')[0] })),
    time && <Text variant="footnote" style={{ color: colors.accent, fontWeight: '600' }}>{labels.time(time)}</Text>,
    !held && !time && task.dueDate && (showDue || overdue) && note(labels.day(task.dueDate), overdue ? 'danger' : undefined),
    task.stepsTotal > 0 && note(t('taskRow.steps', { done: task.stepsDone, total: task.stepsTotal })),
    !!task.commentCount && (
      <View style={[styles.count, { gap: 3 }]} accessible accessibilityLabel={t('taskRow.comments', { count: task.commentCount })}>
        <Feather name="message-circle" size={12} color={colors.ink3} />
        <Text variant="footnote" color="ink3">{task.commentCount}</Text>
      </View>
    ),
    task.repeats && <Feather name="repeat" size={12} color={colors.ink3} />,
    showAssignment && task.assignmentStatus === 'pending' && <Text variant="footnote" style={{ color: colors.warn }}>{t('taskRow.pending')}</Text>,
    task.assignmentStatus === 'declined' && (
      <Text variant="footnote" color="danger" numberOfLines={2}>{showAssignment && task.declineReason ? t('taskRow.declinedReason', { reason: task.declineReason }) : t('taskRow.declined')}</Text>
    ),
    outside && note(t('taskRow.outsideList')),
    awaiting ? note(t('taskRow.completed'), 'success') : task.status === 'completed' && note(t('search.completed')),
    task.invitedEmail && note(`${t('taskRow.invited')} · ${task.invitedEmail}`),
  ].filter(Boolean);
  if (!parts.length) return null;
  return (
    <View style={[styles.meta, { gap: space.xs }]}>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <Text variant="footnote" color="ink3">·</Text>}
          {part}
        </Fragment>
      ))}
    </View>
  );
}

/** The right of a task row: a red flag when important (M44), then whoever has it, you included (M44), except you in the Inbox, which is only ever yours (D88); a mail icon for someone invited. */
export function TaskMarks({ task, hideFace = false }: { task: TaskSummary; hideFace?: boolean }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const meId = useSessionStore((s) => s.userId);
  const who = task.assignee && !hideFace && !(task.taskList?.isInbox && task.assignee.id === meId) ? task.assignee : null;
  const invited = !who && !!task.invitedEmail;
  if (!task.isImportant && !who && !invited) return null;
  return (
    <View style={[styles.end, { gap: space.sm }]}>
      {task.isImportant && <Feather name="flag" size={15} color={colors.danger} accessibilityLabel={t('taskRow.important')} />}
      {invited && (
        <View accessible accessibilityLabel={`${t('taskRow.invited')} · ${task.invitedEmail}`} style={[styles.mail, { backgroundColor: colors.surface2 }]}>
          <Feather name="mail" size={12} color={colors.ink2} />
        </View>
      )}
      {who && (
        <View accessible accessibilityLabel={t('taskRow.assignedTo', { name: who.displayName })}>
          <Avatar name={who.displayName} seed={who.id} size={22} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0, gap: 3 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  end: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center' },
  mail: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pause: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  count: { flexDirection: 'row', alignItems: 'center' },
  chip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, maxWidth: '100%' },
});
