import { Feather } from '@expo/vector-icons';
import { useNavigation, usePreventRemove, type StaticScreenProps } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { formatInstant, todayIn } from '@/core/dates/localDate';
import { isApiError } from '@/core/http/problem';
import type { Id } from '@/core/types';
import { tasksApi } from '@/data/tasks/api';
import { taskKeys } from '@/data/tasks/keys';
import { restoreTask, useChangeTask, useDeleteTask, useSaveTask, type TaskChange } from '@/data/tasks/mutations';
import { useTask } from '@/data/tasks/queries';
import { taskLimits, type Task, type UserRef } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { CollectionIcon, TagsRow } from '@/shared/components';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { errorMessage } from '@/shared/i18n/errors';
import { askReason, Button, confirm, ListRow, Notice, Pill, Screen, space, Text, useTheme, useToast } from '@/shared/ui';

import { StepList } from './components/StepList';
import { changedKeys, patchOf } from './taskDraft';
import { useDirty, useTaskDraft } from './taskDraftStore';
import { useTaskSheet } from './taskSheetStore';
import { useRepeatText } from './useRepeatText';

/**
 * Task detail (06-mobile.md, M25, M26), pushed from any task row. Every edit goes into a draft (`taskDraftStore`): the
 * title in place, the Important flag (a red edge when on, M24), the rows for Collection, Due date, Reminder, Repeat and
 * Tags (each a page in `TaskFieldSheet`), steps and notes. **Save** in the header sends what changed in one PATCH
 * (D56); leaving with unsaved changes asks first. Complete / reopen, Skip and Delete are commands that act at once,
 * saving pending edits first. A task assigned to the caller and waiting for their answer is read-only, with no Save or
 * Delete, until they answer in its Assignment row (M35): Reject goes back, Accept turns it into the usual screen.
 */
export function TaskDetailScreen({ route }: StaticScreenProps<{ taskId: Id }>) {
  const { taskId } = route.params;
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
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
  const leaving = useRef(false);   // set when the screen closes on purpose (after Delete): no discard prompt
  // The fields the rows show; the title, notes and steps read their own slices (docs/performance.md, rule 2).
  const fields = useTaskDraft(
    useShallow((s) => (s.draft ? { isImportant: s.draft.isImportant, dueDate: s.draft.dueDate, reminder: s.draft.reminder, repeat: s.draft.repeat, collection: s.draft.collection, tags: s.draft.tags } : null)),
  );

  // The task as read becomes the draft (unsaved edits of this task are kept); leaving drops it.
  useEffect(() => {
    if (task) load(task);
  }, [task, load]);
  useEffect(() => clear, [clear]);

  // A task that is gone (deleted elsewhere, no longer shared) closes its screen (06-mobile.md, Errors).
  const missing = isApiError(query.error) && query.error.status === 404;
  useEffect(() => {
    if (missing) {
      leaving.current = true;
      navigation.goBack();
    }
  }, [missing, navigation]);

  /** Sends the draft's changes. True when there was nothing to save or it saved; a 412 keeps the edits on the latest task. */
  const saveDraft = async (): Promise<boolean> => {
    const { base, draft, version } = useTaskDraft.getState();
    if (!base || !draft || !changedKeys(base, draft).length) return true;
    try {
      const saved = await save.mutateAsync({ version, body: patchOf(base, draft) });
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

  // Waiting for the caller's answer (M35): nothing changes until they accept, so there is no Save.
  const waiting = !!task && !!me && task.assignee?.id === me.id && task.assignmentStatus === 'pending';
  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: waiting ? undefined : () => <SaveButton pending={save.isPending} onPress={saveDraft} /> });
  });

  // Leaving with unsaved changes asks first (HIG): Discard or Keep editing.
  usePreventRemove(dirty, ({ data }) => {
    if (leaving.current) return navigation.dispatch(data.action);
    confirm({ title: t('taskDetail.discardTitle'), message: t('taskDetail.discardMessage'), confirmLabel: t('taskDetail.discard'), cancelLabel: t('taskDetail.keepEditing') }).then(
      (ok) => ok && navigation.dispatch(data.action),
    );
  });

  if (!task || !me || !today || !fields) {
    return <Screen edges={['bottom']}>{query.error && !missing ? <Notice>{errorMessage(query.error)}</Notice> : null}</Screen>;
  }

  const locale = i18n.language;
  const completed = task.status === 'completed';
  const overdue = !!fields.dueDate && fields.dueDate < today && !completed;

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
  const toggleComplete = () =>
    completed
      ? run({ run: (x) => tasksApi.reopen(x), optimistic: (x) => ({ ...x, status: 'open', completedAt: null, completedBy: null }) })
      : run(
          // A repeating task stays open on its next date, so it isn't shown completed.
          { run: (x) => tasksApi.complete(x), optimistic: (x) => (x.repeat ? x : { ...x, status: 'completed' }) },
          next ? t('taskDetail.nextOn', { date: labels.day(next) }) : undefined,
        );
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

  // M35: Accept unlocks this screen; Reject asks first, with an optional reason the assigner sees, then goes back.
  const accept = () => command.mutate({ run: (x) => tasksApi.answerAssignment(x, true), optimistic: (x) => ({ ...x, assignmentStatus: 'accepted' }) });
  const reject = async (assigner: string) => {
    const reason = await askReason({
      title: t('taskDetail.rejectTitle'),
      message: t('taskDetail.rejectMessage', { name: assigner }),
      confirmLabel: t('taskDetail.reject'),
      cancelLabel: t('common.cancel'),
      maxLength: taskLimits.rejectReasonMax,
    });
    if (reason === null) return;
    command.mutate(
      { run: (x: Task) => tasksApi.answerAssignment(x, false, reason) },
      {
        onSuccess: () => {
          leaving.current = true;
          navigation.goBack();
          useToast.getState().show({ message: t('taskDetail.rejected', { name: assigner }) });
        },
      },
    );
  };
  const assigner = task.assignedBy?.displayName || t('notifications.someone');
  // While waiting, the fields read only: dimmed, and taps don't reach them.
  const locked = waiting ? ({ pointerEvents: 'none', style: styles.locked, accessibilityState: { disabled: true } } as const) : {};

  const error = save.error ?? command.error ?? remove.error;

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ paddingBottom: space.huge }}>
      {error && (
        <View style={{ marginBottom: space.md }}>
          <Notice>{errorMessage(error)}</Notice>
        </View>
      )}

      <View {...locked}>
      <View style={[styles.head, { gap: space.md, paddingTop: space.sm }, fields.isImportant && [styles.edge, { borderLeftColor: colors.danger }]]}>
        <Pressable
          onPress={toggleComplete}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed }}
          accessibilityLabel={t(completed ? 'taskDetail.reopen' : 'taskDetail.complete')}
          style={[styles.check, { borderColor: completed ? colors.accent : colors.ink3, backgroundColor: completed ? colors.accent : 'transparent' }]}
        >
          {completed && <Feather name="check" size={16} color={colors.onAccent} />}
        </Pressable>
        <TitleField completed={completed} />
        <Pressable
          onPress={() => edit({ isImportant: !fields.isImportant })}
          accessibilityRole="switch"
          accessibilityState={{ checked: fields.isImportant }}
          accessibilityLabel={t('taskDetail.important')}
          style={styles.flag}
        >
          <Feather name="flag" size={22} color={fields.isImportant ? colors.danger : colors.ink3} />
        </Pressable>
      </View>

      {completed && (
        <View style={[styles.doneNote, { gap: space.md }]}>
          <Text variant="footnote" color="ink2" style={styles.fill}>
            {task.completedAt ? by(t('taskDetail.completed', { when: when(task.completedAt) }), task.completedBy) : ''}
          </Text>
          <Button variant="link" title={t('taskDetail.reopen')} onPress={toggleComplete} />
        </View>
      )}

      </View>

      <View style={{ marginTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }}>
        {waiting && (
          <View style={[styles.assignment, { gap: space.md, paddingVertical: space.sm, borderBottomColor: colors.line }]} accessibilityRole="summary">
            <Feather name="user" size={20} color={colors.warn} />
            <View style={styles.fill}>
              <Text variant="body">{t('taskDetail.assignment')}</Text>
              <Text variant="caption" color="ink2" numberOfLines={2}>{t('taskDetail.assignmentWaiting', { name: assigner })}</Text>
            </View>
            <Pill label={t('taskDetail.reject')} tone="quiet" onPress={() => reject(assigner)} disabled={command.isPending} />
            <Pill label={t('taskDetail.accept')} onPress={accept} disabled={command.isPending} />
          </View>
        )}
        <View {...locked}>
        <ListRow
          label={t('taskDetail.fields.collection')}
          icon={<CollectionIcon collection={fields.collection} />}
          value={<Text variant="bodyMedium" color="accent" numberOfLines={1}>{fields.collection.name}</Text>}
          onPress={() => open('collection')}
        />
        {fields.dueDate ? (
          <ListRow
            label={t('taskDetail.fields.due')}
            icon={<Feather name="calendar" size={20} color={colors.accent} />}
            value={<Text variant="bodyMedium" color={overdue ? 'danger' : 'accent'}>{overdue ? t('taskDetail.overdue', { date: labels.day(fields.dueDate) }) : labels.day(fields.dueDate)}</Text>}
            onPress={() => open('due')}
            onClear={() => edit({ dueDate: null, repeat: null })}
            clearLabel={t('taskDetail.clearDue')}
          />
        ) : (
          <ListRow label={t('taskDetail.fields.due')} value={t('common.none')} icon={<Feather name="calendar" size={20} color={colors.ink3} />} onPress={() => open('due')} />
        )}
        {fields.reminder ? (
          <ListRow
            label={t('taskDetail.fields.reminder')}
            icon={<Feather name="bell" size={20} color={colors.accent} />}
            value={
              <View style={styles.end}>
                <Text variant="bodyMedium" color="accent">
                  {fields.reminder.date === today ? `${t('dates.today')}, ${labels.time(fields.reminder.time)}` : labels.reminder(fields.reminder)}
                </Text>
                <Text variant="caption" color="ink2">{t('reminders.onlyYou')}</Text>
              </View>
            }
            onPress={() => open('reminder')}
            onClear={() => edit({ reminder: null })}
            clearLabel={t('reminders.remove')}
          />
        ) : (
          <ListRow label={t('taskDetail.fields.reminder')} value={t('common.none')} icon={<Feather name="bell" size={20} color={colors.ink3} />} onPress={() => open('reminder')} />
        )}
        {fields.repeat ? (
          <ListRow
            label={t('taskDetail.fields.repeat')}
            icon={<Feather name="repeat" size={20} color={colors.accent} />}
            value={<Text variant="bodyMedium" color="accent" numberOfLines={2}>{describe(fields.repeat, fields.dueDate)}</Text>}
            onPress={() => open('repeat')}
            onClear={() => edit({ repeat: null })}
            clearLabel={t('taskDetail.clearRepeat')}
          />
        ) : (
          <ListRow label={t('taskDetail.fields.repeat')} value={t('common.none')} icon={<Feather name="repeat" size={20} color={colors.ink3} />} onPress={() => open('repeat')} />
        )}
        <TagsRow tags={fields.tags} onPress={() => open('tags')} onClear={fields.tags.length ? () => edit({ tags: [] }) : undefined} />
        </View>
      </View>

      <View {...locked}>

      {task.repeat && next && !completed && (
        <View style={styles.start}>
          <Button variant="link" title={t('taskDetail.skip', { date: labels.day(next) })} onPress={skip} />
        </View>
      )}

      <StepList canAdd={!completed} />
      <NotesField />
      </View>

      <View style={{ marginTop: space.xxl, gap: space.xxs }}>
        <Text variant="footnote" color="ink3">
          {by(t('taskDetail.created', { when: when(task.createdAt) }), task.createdBy)}
        </Text>
        {task.updatedAt && (
          <Text variant="footnote" color="ink3">
            {by(t('taskDetail.updated', { when: when(task.updatedAt) }), task.updatedBy)}
          </Text>
        )}
      </View>

      {!waiting && (
      <Pressable onPress={deleteTask} disabled={remove.isPending} accessibilityRole="button" style={[styles.delete, { gap: space.sm, marginTop: space.lg }]}>
        {({ pressed }) => (
          <>
            <Feather name="trash-2" size={17} color={colors.danger} />
            <Text variant="bodyMedium" color="danger" style={{ opacity: pressed || remove.isPending ? 0.6 : 1 }}>
              {t('taskDetail.delete')}
            </Text>
          </>
        )}
      </Pressable>
      )}
    </Screen>
  );
}

/** Save in the header: enabled once something changed (and the title isn't blank). */
function SaveButton({ pending, onPress }: { pending: boolean; onPress(): void }) {
  const { t } = useTranslation();
  const dirty = useDirty();
  const titled = useTaskDraft((s) => !!s.draft?.title.trim());
  const enabled = dirty && titled && !pending;
  return (
    <Pressable onPress={onPress} disabled={!enabled} accessibilityRole="button" accessibilityState={{ disabled: !enabled }} hitSlop={8} style={styles.save}>
      {({ pressed }) => (
        <Text variant="button" color={enabled ? 'accent' : 'ink3'} style={{ opacity: pressed ? 0.6 : 1 }}>
          {t('taskDetail.save')}
        </Text>
      )}
    </Pressable>
  );
}

/** The title, edited in place in the draft; only this field redraws while typing. */
function TitleField({ completed }: { completed: boolean }) {
  const { t } = useTranslation();
  const { colors, type } = useTheme();
  const title = useTaskDraft((s) => s.draft?.title ?? '');
  const edit = useTaskDraft((s) => s.edit);
  return (
    <TextInput
      value={title}
      onChangeText={(text) => edit({ title: text.replace(/\n/g, ' ') })}
      multiline
      submitBehavior="blurAndSubmit"
      returnKeyType="done"
      maxLength={taskLimits.titleMax}
      selectionColor={colors.accent}
      accessibilityLabel={t('taskDetail.title')}
      style={[
        styles.title,
        { fontFamily: type.title.fontFamily, fontSize: type.title.fontSize, letterSpacing: type.title.letterSpacing, color: completed ? colors.ink3 : colors.heading },
        completed && styles.struck,
      ]}
    />
  );
}

/** Plain-text notes, edited in place in the draft. */
function NotesField() {
  const { t } = useTranslation();
  const { colors, radius, type } = useTheme();
  const notes = useTaskDraft((s) => s.draft?.notes ?? '');
  const edit = useTaskDraft((s) => s.edit);
  return (
    <View style={{ marginTop: space.xxl, gap: space.sm }}>
      <Text variant="label" color="ink2" accessibilityRole="header">
        {t('taskDetail.notes')}
      </Text>
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
  /** The M24 red edge, left of the circle. */
  edge: { borderLeftWidth: 3, marginLeft: -13, paddingLeft: 10 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  /** No lineHeight on a TextInput (it clips descenders on iOS). */
  title: { flex: 1, padding: 0, paddingTop: 2 },
  struck: { textDecorationLine: 'line-through' },
  flag: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -12 },
  doneNote: { flexDirection: 'row', alignItems: 'center', marginLeft: 40 },
  fill: { flex: 1 },
  end: { alignItems: 'flex-end' },
  start: { alignItems: 'flex-start', marginTop: space.xs },
  notes: { minHeight: 96 },
  delete: { flexDirection: 'row', alignItems: 'center', minHeight: 44, alignSelf: 'flex-start' },
  save: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  locked: { opacity: 0.55 },
  assignment: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
});
