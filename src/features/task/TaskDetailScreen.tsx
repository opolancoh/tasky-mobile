import { Feather } from '@expo/vector-icons';
import { useNavigation, usePreventRemove, type StaticScreenProps } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Keyboard, Pressable, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { formatInstant, todayIn } from '@/core/dates/localDate';
import { isApiError } from '@/core/http/problem';
import type { Id } from '@/core/types';
import { tasksApi } from '@/data/tasks/api';
import { taskKeys } from '@/data/tasks/keys';
import { restoreTask, useChangeTask, useDeleteTask, useSaveTask, type TaskChange } from '@/data/tasks/mutations';
import { useMembers, useTask, useTaskLists } from '@/data/tasks/queries';
import { isEmailAssignee, taskLimits, type Comment, type Task, type UserRef } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { LoadError } from '@/shared/components/LoadError';
import { Avatar, askDecline, CheckCircle, ReminderIcon, TagsRow } from '@/shared/components';
import { useHoldActions } from '@/shared/hold/useHoldActions';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { errorMessage } from '@/shared/i18n/errors';
import { Button, chooseAction, ColorDot, confirm, Notice, Pill, Screen, space, Text, TextButton, useTheme, useToast } from '@/shared/ui';

import { AnswerBar } from './components/AnswerBar';
import { CommentField } from './components/CommentField';
import { CommentThread } from './components/CommentThread';
import { FieldRow } from './components/FieldRow';
import { StepList } from './components/StepList';
import { TaskDetailSkeleton } from './components/TaskDetailSkeleton';
import { assigneeChange, assigneeStatus, changedKeys, patchOf } from './taskDraft';
import { useDirty, useTaskDraft } from './taskDraftStore';
import { useTaskSheet } from './taskSheetStore';
import { useRepeatText } from './useRepeatText';

/**
 * Task detail (06-mobile.md, M25, M26, laid out as M98 and M106), pushed from any task row. Every edit goes into a draft (`taskDraftStore`): the
 * title in place, the Important flag (red when on; no red edge, M98), the list on a line under the title, then
 * the fields in groups: Assigned to (every task, M43, M44) · Due date, Reminder, Repeat · Tags (each a page in
 * `TaskFieldSheet`; empty ones say what a tap does, "Add due date"), then the steps and notes under their headings. **Save** in the header sends what changed in one PATCH
 * (D56) and goes back with a toast; an error keeps the screen and the edits (M59). Leaving with unsaved changes asks first. Complete / reopen, Skip and Delete are commands that act at once,
 * saving pending edits first. A task assigned to the caller and waiting for their answer is read-only, with no Save or
 * Delete, until they answer in the bar docked at the bottom (M101): Decline asks for an optional reason and goes back, Accept
 * turns it into the usual screen.
 * Someone who sees the task only as its assignee (D70, M45) gets "From Olga" instead of the list, the title, date,
 * Important, repeat and tags read only, and Give it back instead of Delete. A task its assignee completed for the user
 * shows Confirm (D71). Comments (D92, M82): a thread at the end and a field docked at the bottom, on a task someone else
 * sees (a shared or team list, or given to someone) or one that has comments; `commentId` (from Activity) tints that one.
 * History is a screen of its own, from ••• on the same tasks (M109).
 */
export function TaskDetailScreen({ route }: StaticScreenProps<{ taskId: Id; commentId?: Id; fromPush?: boolean; pick?: 'assignee' }>) {
  const { taskId, commentId, fromPush, pick } = route.params;
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const holds = useHoldActions();
  const queryClient = useQueryClient();
  const me = useMe().data;
  const query = useTask(taskId);
  const task = query.data;
  const command = useChangeTask(taskId);
  const save = useSaveTask(taskId);
  const remove = useDeleteTask();
  const open = useTaskSheet((s) => s.show);
  const load = useTaskDraft((s) => s.load);
  const clear = useTaskDraft((s) => s.clear);
  const edit = useTaskDraft((s) => s.edit);
  const dirty = useDirty();
  const { describe } = useRepeatText();
  const today = me ? todayIn(me.timeZone) : undefined;
  const labels = useDateLabels(today);
  const scroller = useRef<ScrollViewInstance>(null);
  const leaving = useRef(false);   // set when the screen closes on purpose (after Save or Delete): no discard prompt
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  // The fields the rows show; the title, notes and steps read their own slices (docs/performance.md, rule 2).
  const fields = useTaskDraft(
    useShallow((s) => (s.draft ? { isImportant: s.draft.isImportant, dueDate: s.draft.dueDate, reminder: s.draft.reminder, repeat: s.draft.repeat, taskList: s.draft.taskList, assignee: s.draft.assignee, tags: s.draft.tags } : null)),
  );

  // The task as read becomes the draft (unsaved edits of this task are kept); leaving drops it.
  useEffect(() => {
    if (task) load(task);
  }, [task, load]);
  useEffect(() => clear, [clear]);
  // Opened to pick someone (a declined task's Give it to someone else, M102): the Assigned to picker, once the draft is there.
  const picked = useRef(false);
  const ready = !!fields;
  useEffect(() => {
    if (!pick || !ready || picked.current) return;
    picked.current = true;
    open(pick);
  }, [pick, ready, open]);

  // A task that is gone (deleted elsewhere, no longer shared) closes its screen (06-mobile.md, Errors); opened from a push,
  // Activity instead, with a toast (M88).
  const missing = isApiError(query.error) && query.error.status === 404;
  useEffect(() => {
    if (missing) {
      leaving.current = true;
      navigation.goBack();
      if (fromPush) {
        navigation.navigate('Activity');
        useToast.getState().show({ message: t('push.taskGone') });
      }
    }
  }, [missing, navigation, fromPush, t]);

  /** Sends the draft's changes. True when there was nothing to save or it saved; a 412 keeps the edits on the latest task. */
  const saveDraft = async (): Promise<boolean> => {
    const { base, draft, version } = useTaskDraft.getState();
    if (!base || !draft || !changedKeys(base, draft).length) return true;
    try {
      const saved = await save.mutateAsync({ version, body: patchOf(base, draft), assignee: assigneeChange(base, draft) });
      clear();
      load(saved);
      return true;
    } catch (e) {
      if (isApiError(e) && e.status === 412) {
        const latest = await queryClient.fetchQuery({ queryKey: taskKeys.detail(taskId), queryFn: () => tasksApi.get(taskId), staleTime: 0 });
        useTaskDraft.getState().rebase(latest);
      }
      return false;
    }
  };

  /** Save (M59): the keyboard closes, fields lock while it saves; success goes back with a toast, an error stays. */
  const saveAndLeave = async () => {
    Keyboard.dismiss();
    if (!(await saveDraft())) return scroller.current?.scrollTo({ y: 0, animated: true });   // the error is at the top
    leaving.current = true;
    navigation.goBack();
    useToast.getState().show({ message: t('taskDetail.saved') });
  };

  // Waiting for the caller's answer (M35): nothing changes until they accept, so there is no Save.
  const waiting = !!task && !!me && task.assignee?.id === me.id && task.assignmentStatus === 'pending';

  // Leaving with unsaved changes asks first (HIG): Discard or Keep editing. Back does nothing while Save runs (M59).
  usePreventRemove(dirty || save.isPending, ({ data }) => {
    if (leaving.current) return navigation.dispatch(data.action);
    if (save.isPending) return;
    confirm({ title: t('taskDetail.discardTitle'), message: t('taskDetail.discardMessage'), confirmLabel: t('taskDetail.discard'), cancelLabel: t('taskDetail.keepEditing') }).then(
      (ok) => ok && navigation.dispatch(data.action),
    );
  });

  // On a shared list, an assignee who isn't among its people has only this task (D88, M71): "Outside the list".
  const taskLists = useTaskLists().data;
  const listOf = taskLists?.find((c) => c.id === task?.taskList?.id);
  const sharedList = !!listOf && listOf.sharing !== 'private';
  const people = useMembers({ kind: 'taskList', id: listOf?.id ?? '' }, sharedList).data;

  if (!task || !me || !today || !fields) {
    return (
      <Screen scroll edges={['bottom']} contentStyle={{ paddingBottom: space.huge }}>
        {query.error ? (!missing && <LoadError error={query.error} onRetry={() => void query.refetch()} />) : <TaskDetailSkeleton />}
      </Screen>
    );
  }

  const locale = i18n.language;
  const status = assigneeStatus(task, fields.assignee, me.id);
  // Seen only as its assignee (D70): the list's people define it; this person works on it.
  const outside = !task.taskList;
  const fixed = outside ? ({ pointerEvents: 'none', accessibilityState: { disabled: true } } as const) : {};
  const completed = task.status === 'completed';
  const held = task.status === 'onHold';
  const overdue = !!fields.dueDate && fields.dueDate < today && !completed && !held;

  const when = (iso: string) =>
    t('taskDetail.at', {
      date: formatInstant(iso, locale, me.timeZone, { year: 'numeric', month: 'short', day: 'numeric' }),
      time: formatInstant(iso, locale, me.timeZone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }),
    });
  const by = (line: string, who: UserRef | null | undefined) =>
    !who ? line : who.id === me.id ? t('taskDetail.byYou', { line }) : who.displayName ? t('taskDetail.byName', { line, name: who.displayName }) : line;

  /** Complete, reopen and Skip act at once (M26), after saving pending edits. */
  const run = async (change: TaskChange, toast?: string) => {
    if (!(await saveDraft())) return;
    command.mutate(change);
    if (toast) useToast.getState().show({ message: toast });
  };
  const next = task.repeat?.nextDueDate;
  // Complete or reopen on its way (M75): the circle spins and takes no taps, Reopen waits.
  const toggling = command.isPending && !!command.variables?.toggle;
  const toggleComplete = () =>
    completed
      ? run({ toggle: true, run: (x) => tasksApi.reopen(x), optimistic: (x) => ({ ...x, status: 'open', completedAt: null, completedBy: null }) })
      : run(
          // A repeating task stays open on its next date, so it isn't shown completed.
          { toggle: true, run: (x) => tasksApi.complete(x), optimistic: (x) => (x.repeat ? x : { ...x, status: 'completed' }) },
          next ? t('taskDetail.nextOn', { date: labels.day(next) }) : undefined,
        );
  // On hold (D91, M80): the banner's Resume, the pause icon's menu, Put on hold at the end; pending edits are saved first.
  const resumeHeld = async () => {
    if (await saveDraft()) holds.resumeTask(task);
  };
  const holdTask = async () => {
    if (await saveDraft()) navigation.navigate('Hold', { taskId: task.id, mode: 'hold' });
  };
  const heldMenu = async () => {
    const i = await chooseAction({
      title: `${task.title} · ${t('hold.onHold')}`,
      actions: [{ label: t('hold.resume'), icon: 'play' }, { label: t('hold.complete'), icon: 'check-circle' }, { label: t('hold.edit'), icon: 'edit-2' }],
      cancelLabel: t('common.cancel'),
    });
    if (i === 0) resumeHeld();
    if (i === 1) toggleComplete();
    if (i === 2) holdTask();
  };
  const skip = () => run({ run: (x) => tasksApi.skip(x), optimistic: (x) => ({ ...x, dueDate: next ?? x.dueDate }) }, next ? t('taskDetail.skipped', { date: labels.day(next) }) : undefined);

  // Asks first; deleted once the API agrees (unsaved edits go with it); then back with Undo (Recently Deleted keeps it 30 days).
  const deleteTask = async () => {
    const ok = await confirm({ title: t('taskDetail.deleteTitle'), message: t('taskDetail.deleteMessage'), confirmLabel: t('taskDetail.delete'), cancelLabel: t('common.cancel') });
    if (!ok) return;
    remove.mutate(task, {
      onSuccess: () => {
        leaving.current = true;
        navigation.goBack();
        useToast.getState().show({ message: t('taskDetail.deleted'), action: { label: t('common.undo'), onPress: () => restoreTask(queryClient, task.id) } });
      },
    });
  };

  // M101: Accept unlocks this screen; Decline asks first, with an optional reason the assigner sees, then goes back.
  const accept = () => command.mutate({ run: (x) => tasksApi.answerAssignment(x, true), optimistic: (x) => ({ ...x, assignmentStatus: 'accepted' }) });
  const decline = async (assigner: string) => {
    const reason = await askDecline(t, assigner);
    if (reason === null) return;
    command.mutate(
      { run: (x: Task) => tasksApi.answerAssignment(x, false, reason) },
      {
        onSuccess: () => {
          leaving.current = true;
          navigation.goBack();
          useToast.getState().show({ message: t('assign.declined', { name: assigner }) });
        },
      },
    );
  };
  const assigner = task.assignedBy?.displayName || t('notifications.someone');
  // The line under the title (M98): the draft's list, then who sees it, as a list's own line says it (M64).
  const lineList = taskLists?.find((c) => c.id === fields.taskList?.id);
  const others = (people ?? []).filter((m) => m.userId !== me.id).map((m) => m.displayName.split(' ')[0]);
  const whoSees = !lineList || lineList.sharing === 'private' ? null
    : lineList.team ? lineList.team.name
    : lineList.owner.id !== me.id ? t('browse.ownersList', { name: lineList.owner.displayName.split(' ')[0] })
    : lineList.id === listOf?.id && others.length ? t('browse.sharedWith', { names: others.join(', ') })
    : null;
  const where = [fields.taskList ? (fields.taskList.isInbox ? t('browse.inbox') : fields.taskList.name) : '', whoSees].filter(Boolean).join(' · ');

  // Give it back (D70): asks first; someone who sees only this task loses it, so the screen closes.
  const giveBack = async () => {
    const ok = await confirm({ title: t('taskDetail.giveBackTitle', { title: task.title }), message: t('taskDetail.giveBackMessage', { name: assigner }), confirmLabel: t('taskDetail.giveBack'), cancelLabel: t('common.cancel') });
    if (!ok || !(await saveDraft())) return;
    command.mutate({ run: (x) => tasksApi.unassign(x) }, {
      onSuccess: () => {
        leaving.current = true;
        navigation.goBack();
        useToast.getState().show({ message: t('taskDetail.gaveBack', { name: assigner }) });
      },
    });
  };
  // Comments (D92, M82): when someone else sees the task, or it already has some (the history stays); History in ••• the same (M109).
  const givenTo = !!task.assignee && task.assignee.id !== me.id && !isEmailAssignee(task.assignee.id);
  const commentCount = task.commentCount ?? 0;
  const comments = sharedList || givenTo || outside || commentCount > 0;
  // The ••• menu (M107): only what the caller may do; a sheet from the bottom, as a list's •••.
  const openMenu = async () => {
    const actions = [
      held ? { key: 'resume', label: t('hold.resume'), icon: 'play' as const }
        : !completed && holds.canHold(task) ? { key: 'hold', label: t('hold.put'), icon: 'pause-circle' as const } : null,
      !outside ? { key: 'move', label: t('taskDetail.move'), icon: 'folder' as const } : null,
      comments ? { key: 'history', label: t('history.title'), icon: 'clock' as const } : null,
      outside ? { key: 'back', label: t('taskDetail.giveBack'), icon: 'corner-up-left' as const, destructive: true }
        : { key: 'delete', label: t('taskDetail.delete'), icon: 'trash-2' as const, destructive: true },
    ].filter((a) => !!a);
    const i = await chooseAction({ title: task.title, actions, cancelLabel: t('common.cancel') });
    const key = i === null ? null : actions[i].key;
    if (key === 'resume') resumeHeld();
    // Saving first changes the version: hold the task as saved.
    if (key === 'hold' && (await saveDraft())) holds.putOnHold(queryClient.getQueryData<Task>(taskKeys.detail(taskId)) ?? task);
    if (key === 'move') open('taskList');
    if (key === 'history') navigation.navigate('TaskHistory', { taskId });
    if (key === 'back') giveBack();
    if (key === 'delete') deleteTask();
  };
  const confirmDone = () => run({ run: (x) => tasksApi.confirm(x), optimistic: (x) => ({ ...x, awaitsConfirmation: false }) }, t('taskDetail.confirmed'));
  // While waiting, everything reads only (fields, comments, history): dimmed, and taps don't reach them. While Save runs, taps don't reach them (M59).
  const locked = waiting ? ({ pointerEvents: 'none', style: styles.locked, accessibilityState: { disabled: true } } as const) : save.isPending ? ({ pointerEvents: 'none' } as const) : {};

  const error = save.error ?? command.error ?? remove.error;

  // Who can be mentioned: who sees the task (its list's people, its assignee; for an outside assignee, who gave it).
  const mentionable = [...new Map([
    ...(people ?? []).map((m) => [m.userId, { id: m.userId, displayName: m.displayName }] as const),
    ...[task.assignee, task.assignedBy].filter((u): u is UserRef => !!u && !isEmailAssignee(u.id)).map((u) => [u.id, u] as const),
  ]).values()].filter((u) => u.id !== me.id && !!u.displayName);
  const commentField = comments && !waiting
    ? <CommentField key={editingComment?.id ?? 'new'} taskId={taskId} people={mentionable} editing={editingComment} onDone={() => setEditingComment(null)} />
    : undefined;
  // Waiting for the caller's answer (M101): Decline and Accept docked where the comment field would be.
  const answerBar = waiting
    ? <AnswerBar from={task.assignedBy} due={task.dueDate ? labels.day(task.dueDate) : undefined} busy={command.isPending} onDecline={() => decline(assigner)} onAccept={accept} />
    : undefined;

  return (
    <Screen scroll scrollRef={scroller} edges={['bottom']} contentStyle={{ paddingBottom: space.huge }} footer={answerBar ?? commentField}>
      <TaskHeader hidden={waiting} pending={save.isPending} onSave={saveAndLeave} onMenu={openMenu} />
      {error && (
        <View style={{ marginBottom: space.md }}>
          <Notice>{errorMessage(error)}</Notice>
        </View>
      )}

      <View {...locked}>
      <View style={[styles.head, { gap: space.md, paddingTop: space.sm }]}>
        {held ? (
          <Pressable onPress={heldMenu} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('hold.menuLabel', { title: task.title })} style={styles.checkSpot}>
            <Feather name="pause-circle" size={28} color={colors.warn} />
          </Pressable>
        ) : (
          <CheckCircle checked={completed} saving={toggling} onPress={toggleComplete} size={28} style={styles.checkSpot} label={t(completed ? 'taskDetail.reopen' : 'taskDetail.complete')} />
        )}
        <TitleField completed={completed} editable={!outside} />
        <Pressable
          onPress={() => edit({ isImportant: !fields.isImportant })}
          disabled={outside}
          accessibilityRole="switch"
          accessibilityState={{ checked: fields.isImportant }}
          accessibilityLabel={t('taskDetail.important')}
          style={styles.flag}
        >
          <Feather name="flag" size={22} color={fields.isImportant ? colors.danger : colors.ink3} />
        </Pressable>
      </View>

      {/* Where it is (M98): the list and who sees it, under the title; a tap moves it. Seen only as its assignee: who gave it. */}
      {fields.taskList ? (
        <Pressable onPress={() => open('taskList')} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${t('taskDetail.fields.taskList')}: ${where}`} style={[styles.where, { gap: space.xs }]}>
          {fields.taskList.isInbox ? <Feather name="inbox" size={14} color={colors.ink3} /> : <ColorDot color={fields.taskList.color} size={9} />}
          <Text variant="footnote" color="ink2" numberOfLines={1} style={styles.fill}>{where}</Text>
        </Pressable>
      ) : (
        <View style={[styles.where, { gap: space.xs }]}>
          <Avatar name={assigner} seed={task.assignedBy?.id ?? assigner} size={20} />
          <Text variant="footnote" color="ink2" numberOfLines={1} style={styles.fill}>{`${t('taskDetail.from')} ${assigner}`}</Text>
        </View>
      )}

      {held && (
        // The banner (M80): why it waits, until when, who paused it and who can resume it, and Resume.
        <View style={[styles.assignment, styles.banner, { gap: space.md, padding: space.md, marginTop: space.md, backgroundColor: colors.warnSoft }]} accessibilityRole="summary">
          <Feather name="pause-circle" size={20} color={colors.warn} />
          <View style={styles.fill}>
            <Text variant="bodyMedium">{task.holdReason ? t('hold.chip', { reason: task.holdReason }) : t('hold.onHold')}</Text>
            <Text variant="caption" color="ink2">
              {[
                task.holdUntil ? t('hold.untilShort', { date: labels.day(task.holdUntil) }) : '',
                task.heldBy ? t('hold.pausedBy', { name: task.heldBy.id === me.id ? t('hold.you') : task.heldBy.displayName }) : '',
                task.resumer ? (task.resumer.id === me.id ? t('hold.youResume') : t('hold.canResume', { name: task.resumer.displayName })) : '',
              ].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Pill label={t('hold.resume')} onPress={resumeHeld} disabled={holds.busy || command.isPending} />
        </View>
      )}

      {task.awaitsConfirmation && (
        <View style={[styles.assignment, { gap: space.md, paddingVertical: space.sm, marginTop: space.md, borderBottomColor: colors.line }]} accessibilityRole="summary">
          <Feather name="check-circle" size={20} color={colors.success} />
          <View style={styles.fill}>
            <Text variant="body">{t('taskDetail.awaitsConfirmation', { name: task.assignee?.displayName || t('notifications.someone') })}</Text>
            <Text variant="caption" color="ink2">{t('taskDetail.awaitsConfirmationBody')}</Text>
          </View>
          <Pill label={t('taskDetail.confirm')} onPress={confirmDone} disabled={command.isPending} />
        </View>
      )}

      {completed && (
        <View style={[styles.doneNote, { gap: space.md }]}>
          <Text variant="footnote" color="ink2" style={styles.fill}>
            {task.completedAt ? by(t('taskDetail.completed', { when: when(task.completedAt) }), task.completedBy) : ''}
          </Text>
          <Button variant="link" title={t('taskDetail.reopen')} onPress={toggleComplete} disabled={toggling} />
        </View>
      )}

      </View>

      {/* The fields in groups (M98): who · when · tags, a hairline between them; no List row (the line under the title). */}
      <View {...locked}>
      <View style={{ marginTop: space.md }}>
        <View style={[styles.group, { borderTopColor: colors.line }]}>
          {/* Assigned to (M43, M44): on every task; on a private list or the Inbox the only choice is Me. */}
          {outside ? (
            <FieldRow
              icon={(color) => <Feather name="user" size={20} color={color} />}
              placeholder=""
              value={t('taskDetail.assignedToMe')}
            />
          ) : (
            <FieldRow
              icon={(color) => <Feather name="user" size={20} color={color} />}
              placeholder={t('taskDetail.assignTo')}
              value={fields.assignee && (fields.assignee.id === me.id ? t('taskDetail.assignedToMe') : t('taskDetail.assignedTo', { name: fields.assignee.displayName }))}
              detail={fields.assignee && fields.assignee.id !== me.id && status && status !== 'accepted' && (   // only what isn't settled; never on yours (M98)
                <View style={[styles.answer, { gap: space.xs + 2 }]}>
                  {/* A thin amber ring: open, so it never reads as a list's (filled) dot. */}
                  <View style={[styles.ring, { borderColor: colors.warn }]} />
                  <Text variant="caption" color="ink2" numberOfLines={2} style={styles.fill}>
                    {status === 'declined' && task.declineReason ? t('taskDetail.declinedReason', { reason: task.declineReason }) : t(`assign.status.${status}`)}
                    {sharedList && people && fields.assignee.id === task.assignee?.id && !people.some((m) => m.userId === fields.assignee?.id) ? ` · ${t('taskRow.outsideList')}` : ''}
                  </Text>
                </View>
              )}
              onPress={() => open('assignee')}
              onClear={() => edit({ assignee: null })}
              clearLabel={t('assign.unassign')}
            />
          )}
        </View>
        <View style={[styles.group, { borderTopColor: colors.line }]}>
          <View {...fixed}>
            <FieldRow
              icon={(color) => <Feather name="calendar" size={20} color={color} />}
              placeholder={t('taskDetail.addDue')}
              value={fields.dueDate && (overdue
                ? <Text variant="body" color="danger">{t('taskDetail.overdue', { date: labels.day(fields.dueDate) })}</Text>
                : t('taskDetail.dueOn', { date: labels.day(fields.dueDate) }))}
              onPress={() => open('due')}
              onClear={() => edit({ dueDate: null, repeat: null })}
              clearLabel={t('taskDetail.clearDue')}
            />
          </View>
          <FieldRow
            icon={(color) => <ReminderIcon color={color} />}
            placeholder={t('taskDetail.remindMe')}
            value={fields.reminder && (fields.reminder.date === today ? `${t('dates.today')}, ${labels.time(fields.reminder.time)}` : labels.reminder(fields.reminder))}
            onPress={() => open('reminder')}
            onClear={() => edit({ reminder: null })}
            clearLabel={t('reminders.remove')}
          />
          <View {...fixed}>
            <FieldRow
              icon={(color) => <Feather name="repeat" size={20} color={color} />}
              placeholder={t('taskDetail.fields.repeat')}
              value={fields.repeat && describe(fields.repeat, fields.dueDate)}
              onPress={() => open('repeat')}
              onClear={() => edit({ repeat: null })}
              clearLabel={t('taskDetail.clearRepeat')}
            />
          </View>
        </View>
        <View {...fixed} style={[styles.group, { borderTopColor: colors.line }]}>
          <TagsRow tags={fields.tags} onPress={() => open('tags')} onClear={fields.tags.length ? () => edit({ tags: [] }) : undefined} divider={false} placeholder={t('taskDetail.addTags')} />
        </View>
        {outside && <Text variant="footnote" color="ink3" style={{ marginTop: space.sm }}>{t('taskDetail.onlyListPeople')}</Text>}

      {task.repeat && next && !completed && (
        <View style={styles.start}>
          <Button variant="link" title={t('taskDetail.skip', { date: labels.day(next) })} onPress={skip} />
        </View>
      )}

      <StepList canAdd={!completed} />
      <NotesField />
      </View>
      </View>

      {comments && (
        <View {...locked}>
        <CommentThread
          taskId={taskId}
          count={commentCount}
          highlight={commentId}
          onHighlight={() => setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 300)}
          onEdit={setEditingComment}
        />
        </View>
      )}

      <View style={{ marginTop: space.xxl, gap: space.xxs }}>
        {/* The latest first (M98): Updated, then Created. */}
        {task.updatedAt && (
          <Text variant="footnote" color="ink3">
            {by(t('taskDetail.updated', { when: when(task.updatedAt) }), task.updatedBy)}
          </Text>
        )}
        <Text variant="footnote" color="ink3">
          {by(t('taskDetail.created', { when: when(task.createdAt) }), task.createdBy)}
        </Text>
      </View>

    </Screen>
  );
}

/** Sets the header once the task is loaded (its menu needs the task); nothing while an assignment waits for an answer (M35). */
function TaskHeader({ hidden, pending, onSave, onMenu }: { hidden: boolean; pending: boolean; onSave(): void; onMenu(): void }) {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: hidden ? undefined : () => <HeaderActions pending={pending} onSave={onSave} onMenu={onMenu} /> });
  });
  return null;
}

/** The header (M107): ••• at the edge; Save fades in to its left once something changed (off while the title is blank), busy while it saves (M56). */
function HeaderActions({ pending, onSave, onMenu }: { pending: boolean; onSave(): void; onMenu(): void }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const dirty = useDirty();
  const titled = useTaskDraft((s) => !!s.draft?.title.trim());
  return (
    <View style={[styles.headerRight, { gap: space.md }]}>
      {(dirty || pending) && (
        <Animated.View entering={FadeIn.duration(200)}>
          <TextButton label={t('taskDetail.save')} onPress={onSave} disabled={!titled} busy={pending} />
        </Animated.View>
      )}
      <Pressable onPress={onMenu} disabled={pending} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('taskDetail.menu')} style={styles.more}>
        <Feather name="more-horizontal" size={22} color={colors.accent} />
      </Pressable>
    </View>
  );
}

/** The title's size (M98): smaller than the type scale's title, so the fields move up. */
const TITLE_SIZE = 22;

/** The title, edited in place in the draft; only this field redraws while typing. */
function TitleField({ completed, editable }: { completed: boolean; editable: boolean }) {
  const { t } = useTranslation();
  const { colors, type } = useTheme();
  const title = useTaskDraft((s) => s.draft?.title ?? '');
  const edit = useTaskDraft((s) => s.edit);
  return (
    <TextInput
      value={title}
      onChangeText={(text) => edit({ title: text.replace(/\n/g, ' ') })}
      editable={editable}
      multiline
      submitBehavior="blurAndSubmit"
      returnKeyType="done"
      maxLength={taskLimits.titleMax}
      selectionColor={colors.accent}
      accessibilityLabel={t('taskDetail.title')}
      style={[
        styles.title,
        { fontFamily: type.title.fontFamily, fontSize: TITLE_SIZE, letterSpacing: type.title.letterSpacing, color: completed ? colors.ink3 : colors.heading },
        completed && styles.struck,
      ]}
    />
  );
}

/** Plain-text notes, edited in place in the draft: "Notes" over a filled box (M106). */
function NotesField() {
  const { t } = useTranslation();
  const { colors, radius, type } = useTheme();
  const notes = useTaskDraft((s) => s.draft?.notes ?? '');
  const edit = useTaskDraft((s) => s.edit);
  return (
    <View style={{ marginTop: space.xxl, gap: space.sm }}>
      <Text variant="label" color="ink2" accessibilityRole="header">{t('taskDetail.notes')}</Text>
      <TextInput
        value={notes}
        onChangeText={(text) => edit({ notes: text })}
        multiline
        placeholder={t('taskDetail.notesPlaceholder')}
        placeholderTextColor={colors.ink3}
        selectionColor={colors.accent}
        maxLength={taskLimits.notesMax}
        textAlignVertical="top"
        accessibilityLabel={t('taskDetail.notes')}
        style={[styles.notes, { backgroundColor: colors.surface2, borderRadius: radius.md, padding: space.md, fontFamily: type.callout.fontFamily, fontSize: type.callout.fontSize, color: colors.ink }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  banner: { borderRadius: 12, borderBottomWidth: 0 },
  checkSpot: { marginTop: 4 },
  /** No lineHeight on a TextInput (it clips descenders on iOS). */
  title: { flex: 1, padding: 0, paddingTop: 2 },
  struck: { textDecorationLine: 'line-through' },
  flag: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -12 },
  doneNote: { flexDirection: 'row', alignItems: 'center', marginLeft: 40 },
  fill: { flex: 1 },
  end: { alignItems: 'flex-end' },
  start: { alignItems: 'flex-start', marginTop: space.xs },
  notes: { minHeight: 96 },
  group: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
  /** Under the title, lined up with it (the 28 pt circle and its gap). */
  where: { flexDirection: 'row', alignItems: 'center', marginLeft: 40, marginTop: 2 },
  answer: { flexDirection: 'row', alignItems: 'center' },
  /** The mark before Pending or Declined (M98). */
  ring: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  locked: { opacity: 0.55 },
  assignment: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
});
