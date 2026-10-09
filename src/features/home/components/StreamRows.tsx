import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LocalDate } from '@/core/types';
import type { Notification } from '@/data/collaboration/types';
import { useMarkRead } from '@/data/collaboration/mutations';
import { useAnswerAssignment, useAnswerInvitation, useCompleteTask, useUpdateTask } from '@/data/tasks/mutations';
import type { MyInvitation, TaskSummary } from '@/data/tasks/types';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { confirm, Pill, Text, useTheme, useToast } from '@/shared/ui';

import { useNotificationText } from '../useNotificationText';

/**
 * Home's rows (M32), shared by Home and See all (HomeList): a lead (the complete circle, or an icon for what isn't a
 * task), the title on one line, one line saying when or why, and one action. Tapping the row opens what it is about.
 */
function StreamRow({ lead, title, sub, action, onPress, label }: { lead: ReactNode; title: string; sub?: ReactNode; action?: ReactNode; onPress(): void; label?: string }) {
  const { colors, space } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
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
          {action}
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

/** The complete circle: fills at once; the lists refetch after the API answers. */
function Check({ task }: { task: TaskSummary }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const complete = useCompleteTask();
  const [ticked, setTicked] = useState(false);
  return (
    <Pressable
      onPress={() => {
        if (ticked) return;
        setTicked(true);
        complete.mutate(task);
      }}
      hitSlop={11}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: ticked }}
      accessibilityLabel={t('taskRow.complete', { title: task.title })}
      style={[styles.check, { borderColor: ticked ? colors.accent : colors.ink3, backgroundColor: ticked ? colors.accent : 'transparent' }]}
    >
      {ticked && <Feather name="check" size={14} color={colors.onAccent} />}
    </Pressable>
  );
}

const Flag = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return <Feather name="flag" size={15} color={colors.danger} accessibilityLabel={t('taskRow.important')} />;
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
  const kind = t(invitation.teamId ? 'home.kindTeam' : 'home.kindList');
  const respond = async (join: boolean) => {
    if (!join) {
      const ok = await confirm({ title: t('invitation.declineTitle', { name: invitation.name }), message: t('invitation.declineMessage'), confirmLabel: t('invitation.decline'), cancelLabel: t('common.cancel') });
      if (!ok) return;
    }
    answer.mutate({ id: invitation.id, join }, { onSuccess: () => useToast.getState().show({ message: join ? t('home.joined', { name: invitation.name }) : t('home.declined') }) });
  };
  return (
    <StreamRow
      lead={<Badge icon="users" tone="accent" />}
      title={invitation.name}
      sub={invitation.invitedBy?.displayName ? t('home.invitedBy', { name: invitation.invitedBy.displayName, kind }) : kind}
      onPress={() => navigation.navigate('Invitation', { invitationId: invitation.id })}
      action={
        <View style={styles.actions}>
          <Pill label={t('home.decline')} tone="quiet" onPress={() => respond(false)} disabled={answer.isPending} />
          <Pill label={t('home.join')} onPress={() => respond(true)} disabled={answer.isPending} />
        </View>
      }
    />
  );
}

/** An assignment waiting for the caller's answer: Accept here; rejecting (with a reason) is in Task detail (M35). */
export function AskRow({ task, today }: { task: TaskSummary; today: LocalDate }) {
  const { t } = useTranslation();
  const labels = useDateLabels(today);
  const open = useOpenTask();
  const answer = useAnswerAssignment();
  const by = task.assignee?.displayName;
  return (
    <StreamRow
      lead={<Badge icon="user" tone="warn" />}
      title={task.title}
      sub={task.dueDate ? t('home.assignedDue', { date: labels.day(task.dueDate) }) : t('home.assigned')}
      onPress={() => open(task)}
      label={by ? `${task.title}, ${by}` : task.title}
      action={<Pill label={t('home.accept')} onPress={() => answer.mutate({ task, accept: true }, { onSuccess: () => useToast.getState().show({ message: t('home.accepted') }) })} disabled={answer.isPending} />}
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
      lead={<Check task={task} />}
      title={task.title}
      sub={<Text variant="footnote" color="danger">{labels.day(task.dueDate!)}</Text>}
      onPress={() => open(task)}
      action={<Pill label={t('home.toToday')} onPress={() => update.mutate({ task, body: { dueDate: today } }, { onSuccess: () => useToast.getState().show({ message: t('home.movedToday') }) })} disabled={update.isPending} />}
    />
  );
}

/**
 * A task in Today, Coming up, Important, the Inbox or the shared list. Lean (M32): the title, then only what says when
 * (`when`: Today's reminder time, Coming up's day, the due date elsewhere), and a flag when important.
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
  return <StreamRow lead={<Check task={task} />} title={task.title} sub={sub} onPress={() => open(task)} action={task.isImportant ? <Flag /> : undefined} />;
}

/** An update: a dot while unread; opening it marks it read and goes to its task (or Browse for a list or team). */
export function UpdateRow({ notification }: { notification: Notification }) {
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const markRead = useMarkRead();
  const text = useNotificationText();
  const { line, when, icon } = text(notification);
  const open = () => {
    if (!notification.readAt) markRead.mutate([notification.id]);
    if (notification.taskId) navigation.navigate('TaskDetail', { taskId: notification.taskId });
    else navigation.navigate('Tabs', { screen: 'Browse' });
  };
  return (
    <StreamRow
      lead={
        <View style={[styles.updateLead, { gap: space.sm }]}>
          <View style={[styles.dot, { backgroundColor: notification.readAt ? 'transparent' : colors.unreadDot }]} />
          <Badge icon={icon} tone="grey" />
        </View>
      }
      title={line}
      sub={when}
      onPress={open}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  main: { flex: 1, minWidth: 0, gap: 2 },
  badge: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  actions: { flexDirection: 'row', gap: 6 },
  updateLead: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
