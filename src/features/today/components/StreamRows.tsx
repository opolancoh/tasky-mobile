import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Id, LocalDate } from '@/core/types';
import { restoreTask, useAnswerAssignment, useAnswerInvitation, useCompleteTask, useConfirmTask, useDeleteTask, useReassignTask, useUpdateTask } from '@/data/tasks/mutations';
import { useTaskLists } from '@/data/tasks/queries';
import type { MyInvitation, TaskSummary } from '@/data/tasks/types';
import { askDecline, CheckCircle, useTaskCheck, useTaskSaving } from '@/shared/components';
import { useHoldActions } from '@/shared/hold/useHoldActions';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { useMe } from '@/data/tenancy/queries';
import { chooseAction, confirm, Pill, Text, useTheme, useToast, type ActionChoice } from '@/shared/ui';


/**
 * Home's rows (M32, M65), shared by Home and See all (TodayList): a lead (the complete circle, or an icon for what isn't a
 * task), the title on one line, one line saying when or why, and one action. Tapping the row opens what it is about.
 */
function StreamRow({ lead, title, sub, action, onPress, label, taskId }: { lead: ReactNode; title: string; sub?: ReactNode; action?: ReactNode; onPress(): void; label?: string; /** A task's row: no taps while its toggle saves (M75). */ taskId?: Id }) {
  const { colors, space } = useTheme();
  const saving = useTaskSaving(taskId);
  return (
    <Pressable onPress={onPress} disabled={saving} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ busy: saving }}>
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.sm + 2, borderBottomColor: colors.line, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
          {lead}
          <View style={styles.main}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {title}
            </Text>
            {sub ? (
              <Text variant="footnote" color="ink3" numberOfLines={1}>
                {sub}
              </Text>
            ) : null}
          </View>
          {action && <View pointerEvents={saving ? 'none' : 'auto'}>{action}</View>}
        </View>
      )}
    </Pressable>
  );
}

/** A soft square with an icon, for rows that aren't tasks (an invitation, an assignment to answer, an update). */
function Badge({ icon, tone }: { icon: ComponentProps<typeof Feather>['name']; tone: 'accent' | 'warn' | 'grey' }) {
  const { colors } = useTheme();
  const [bg, fg] = tone === 'accent' ? [colors.accentSoft, colors.accent] : tone === 'warn' ? [colors.warnSoft, colors.warn] : [colors.surface2, colors.ink2];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Feather name={icon} size={16} color={fg} />
    </View>
  );
}

/** The complete circle (M75): the row leaves Home at once, and comes back if the API says no. */
function Check({ task }: { task: TaskSummary }) {
  const { t } = useTranslation();
  const complete = useCompleteTask();
  const { spinning, tap } = useTaskCheck(task, (x) => complete.mutate(x));
  return <CheckCircle checked={false} saving={spinning} onPress={tap} label={t('taskRow.complete', { title: task.title })} />;
}

const Flag = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return <Feather name="flag" size={12} color={colors.danger} accessibilityLabel={t('taskRow.important')} />;
};

function useOpenTask() {
  const navigation = useNavigation();
  return (task: { id: string }) => navigation.navigate('TaskDetail', { taskId: task.id });
}

/** An invitation (M34): Decline and Join here; the row opens Invitation. */
export function InvitationRow({ invitation }: { invitation: MyInvitation }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const answer = useAnswerInvitation();
  const kind = t(invitation.teamId ? 'today.kindTeam' : 'today.kindList');
  const respond = async (join: boolean) => {
    if (!join) {
      const ok = await confirm({ title: t('invitation.declineTitle', { name: invitation.name }), message: t('invitation.declineMessage'), confirmLabel: t('invitation.decline'), cancelLabel: t('common.cancel') });
      if (!ok) return;
    }
    answer.mutate({ id: invitation.id, join }, { onSuccess: () => useToast.getState().show({ message: join ? t('today.joined', { name: invitation.name }) : t('today.declined') }) });
  };
  return (
    <StreamRow
      lead={<Badge icon="users" tone="accent" />}
      title={invitation.name}
      sub={invitation.invitedBy?.displayName ? t('today.invitedBy', { name: invitation.invitedBy.displayName, kind }) : kind}
      onPress={() => navigation.navigate('Invitation', { invitationId: invitation.id })}
      action={
        <View style={styles.actions}>
          <Pill label={t('today.decline')} tone="quiet" onPress={() => respond(false)} disabled={answer.isPending} />
          <Pill label={t('today.join')} onPress={() => respond(true)} disabled={answer.isPending} />
        </View>
      }
    />
  );
}

/** An assignment waiting for the caller's answer: Decline (with an optional reason) and Accept, here as in Task detail (M101). */
export function AskRow({ task, today }: { task: TaskSummary; today: LocalDate }) {
  const { t } = useTranslation();
  const labels = useDateLabels(today);
  const open = useOpenTask();
  const answer = useAnswerAssignment();
  const by = task.assignee?.displayName;
  const from = task.assignedBy?.displayName || t('notifications.someone');
  // Decline (M101): the same reason sheet as Task detail; the row leaves Requests once answered.
  const decline = async () => {
    const reason = await askDecline(t, from);
    if (reason === null) return;
    answer.mutate({ task, accept: false, reason }, { onSuccess: () => useToast.getState().show({ message: t('assign.declined', { name: from }) }) });
  };
  return (
    <StreamRow
      lead={<Badge icon="users" tone="accent" />}
      title={task.title}
      sub={task.dueDate ? t('today.assignedDue', { date: labels.day(task.dueDate) }) : t('today.assigned')}
      onPress={() => open(task)}
      label={by ? `${task.title}, ${by}` : task.title}
      action={
        <View style={styles.actions}>
          <Pill label={t('assign.decline')} tone="quiet" onPress={decline} disabled={answer.isPending} />
          <Pill label={t('today.accept')} onPress={() => answer.mutate({ task, accept: true }, { onSuccess: () => useToast.getState().show({ message: t('today.accepted') }) })} disabled={answer.isPending} />
        </View>
      }
    />
  );
}

/**
 * A task the caller gave someone that needs them (D71, M45): declined ("Oscar declined · reason" and Review, M102),
 * dropped (given back, D100: to assign again), or completed and waiting for Confirm, here.
 */
export function FollowUpRow({ task }: { task: TaskSummary }) {
  const { t } = useTranslation();
  const open = useOpenTask();
  const confirmTask = useConfirmTask();
  const person = task.droppedBy ?? task.assignee;
  const who = person?.displayName || t('notifications.someone');
  const declined = task.assignmentStatus === 'declined';
  const answered = declined || !!task.droppedBy;
  const label = task.droppedBy ? 'today.droppedBy' : declined ? 'today.declinedBy' : 'today.completedBy';
  const review = useReviewDeclined();
  const reason = declined && !task.droppedBy ? task.declineReason : null;
  return (
    <StreamRow
      lead={<Badge icon="users" tone="accent" />}
      title={task.title}
      sub={
        <Text variant="footnote" color={answered ? 'danger' : 'success'} numberOfLines={1}>
          {t(label, { name: who.split(' ')[0] })}
          {reason ? <Text variant="footnote" color="ink2">{` · ${reason}`}</Text> : null}
        </Text>
      }
      onPress={() => open(task)}
      action={
        declined && !task.droppedBy ? <Pill label={t('today.review')} onPress={() => review.run(task)} disabled={review.busy} />
          : answered ? undefined
          : <Pill label={t('taskRow.confirm')} onPress={() => confirmTask.mutate(task)} disabled={confirmTask.isPending} />
      }
    />
  );
}

/**
 * Review on a declined row (M102): what happens to the task now, in a menu. I'll do it (:assign to the caller), Give it
 * to someone else (Task detail with the Assigned to picker open), Leave it unassigned (a shared list only: on a list
 * nobody else sees, unassigned is yours anyway), Delete task (asks first, Undo). Each takes the row out of Requests.
 */
function useReviewDeclined() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const me = useMe().data;
  const lists = useTaskLists().data;
  const reassign = useReassignTask();
  const remove = useDeleteTask();
  const toast = (message: string) => useToast.getState().show({ message });
  const run = async (task: TaskSummary) => {
    const sharing = lists?.find((c) => c.id === task.taskList?.id)?.sharing;
    const choices: [ActionChoice, 'mine' | 'other' | 'none' | 'delete'][] = [
      [{ label: t('today.doItMyself'), icon: 'check' }, 'mine'],
      [{ label: t('today.giveToSomeoneElse'), icon: 'user-plus' }, 'other'],
      ...(sharing && sharing !== 'private' ? [[{ label: t('today.leaveUnassigned'), icon: 'user-x' }, 'none'] as [ActionChoice, 'none']] : []),
      [{ label: t('today.deleteTask'), icon: 'trash-2', destructive: true }, 'delete'],
    ];
    const i = await chooseAction({ title: task.title, actions: choices.map(([c]) => c), cancelLabel: t('common.cancel') });
    const pick = i === null ? null : choices[i][1];
    if (pick === 'mine' && me) reassign.mutate({ task, to: me.id }, { onSuccess: () => toast(t('today.yoursNow')) });
    if (pick === 'other') navigation.navigate('TaskDetail', { taskId: task.id, pick: 'assignee' });
    if (pick === 'none') reassign.mutate({ task, to: null }, { onSuccess: () => toast(t('today.leftUnassigned', { list: task.taskList?.name ?? '' })) });
    if (pick === 'delete') {
      const ok = await confirm({ title: t('today.deleteTitle'), message: t('today.deleteMessage'), confirmLabel: t('today.deleteTask'), cancelLabel: t('common.cancel') });
      if (ok) remove.mutate(task, { onSuccess: () => useToast.getState().show({ message: t('today.deleted'), action: { label: t('common.undo'), onPress: () => restoreTask(queryClient, task.id) } }) });
    }
  };
  return { run, busy: reassign.isPending || remove.isPending };
}

/** A task on hold whose Until has come, for the caller to resume (D91, M80): why it waits, and Resume. */
export function HoldRow({ task }: { task: TaskSummary }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const open = useOpenTask();
  const holds = useHoldActions();
  return (
    <StreamRow
      lead={<Badge icon="users" tone="accent" />}
      title={task.title}
      sub={<Text variant="footnote" style={{ color: colors.warn }} numberOfLines={1}>{task.holdReason ? t('hold.untilTodayWhy', { reason: task.holdReason }) : t('hold.untilToday')}</Text>}
      onPress={() => open(task)}
      action={<Pill label={t('hold.resume')} onPress={() => holds.resumeTask(task)} disabled={holds.busy} />}
    />
  );
}

/** An overdue task of the caller's: when it was due (red) and Today, which moves it to today. */
export function OverdueRow({ task, today }: { task: TaskSummary; today: LocalDate }) {
  const { t } = useTranslation();
  const labels = useDateLabels(today);
  const open = useOpenTask();
  const update = useUpdateTask();
  return (
    <StreamRow
      lead={<Check task={task} />} taskId={task.id}
      title={task.title}
      sub={<Text variant="footnote" color="danger">{labels.day(task.dueDate!)}</Text>}
      onPress={() => open(task)}
      action={<Pill label={t('today.toToday')} onPress={() => update.mutate({ task, body: { dueDate: today } }, { onSuccess: () => useToast.getState().show({ message: t('today.movedToday') }) })} disabled={update.isPending} />}
    />
  );
}

/**
 * A task in Today, Coming up, Important or the Inbox. Lean (M32): the title, then only what says when
 * (`when`: Today's reminder time, Coming up's day, the due date elsewhere), with a red flag last when important (M44).
 */
export function TaskStreamRow({ task, today, when }: { task: TaskSummary; today: LocalDate; when: 'time' | 'day' | 'due' | 'none' }) {
  const labels = useDateLabels(today);
  const { colors } = useTheme();
  const open = useOpenTask();
  const overdue = !!task.dueDate && task.dueDate < today;
  const sub =
    when === 'time' ? (task.reminder?.date === today ? <Text variant="footnote" style={{ color: colors.accent, fontWeight: '600' }}>{labels.time(task.reminder.time)}</Text> : undefined)
    : when === 'day' ? labels.day(task.dueDate!)
    : when === 'due' && task.dueDate ? <Text variant="footnote" color={overdue ? 'danger' : 'ink3'}>{labels.day(task.dueDate)}</Text>
    : undefined;
  return <StreamRow lead={<Check task={task} />} taskId={task.id} title={task.title} sub={task.isImportant ? <>{sub}{sub ? '  ' : ''}<Flag /></> : sub} onPress={() => open(task)} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  main: { flex: 1, minWidth: 0, gap: 2 },
  badge: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 6 },
});
