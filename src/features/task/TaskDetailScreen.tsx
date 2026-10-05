import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatInstant, todayIn } from '@/core/dates/localDate';
import { isApiError } from '@/core/http/problem';
import type { Id } from '@/core/types';
import { restoreTask, useChangeTask, useDeleteTask, type TaskChange } from '@/data/tasks/mutations';
import { useTask } from '@/data/tasks/queries';
import { taskLimits, type UserRef } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { CollectionIcon, TagsRow } from '@/shared/components';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { errorMessage } from '@/shared/i18n/errors';
import { useCurrentWorkspace } from '@/shared/session/useCurrentWorkspace';
import { Button, ListRow, Notice, Screen, space, Text, useTheme, useToast } from '@/shared/ui';

import { StepList } from './components/StepList';
import { reminderOf } from './reminderOf';
import { taskChanges } from './taskChanges';
import { useTaskSheet, type TaskField } from './taskSheetStore';
import { useRepeatText } from './useRepeatText';

/**
 * Task detail (06-mobile.md, M25), pushed from any task row. The title edits in place next to the circle
 * (complete / reopen) and the Important flag (a red edge when on, M24). Collection, Due date, Reminder, Repeat
 * and Tags are rows with ✕, or "None" and a chevron when empty (as in Quick add); each opens its page in `TaskFieldSheet`. Then steps, notes, who
 * created and last changed it (in the profile's time zone), and Delete with Undo. Every edit goes through
 * `useChangeTask` (If-Match, a 412 reread and retry, lists refetched).
 */
export function TaskDetailScreen({ route }: StaticScreenProps<{ taskId: Id }>) {
  const { taskId } = route.params;
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const me = useMe().data;
  const workspace = useCurrentWorkspace();
  const wid = workspace?.id;
  const query = useTask(wid, taskId);
  const task = query.data;
  const change = useChangeTask(wid, taskId);
  const remove = useDeleteTask(wid);
  const showSheet = useTaskSheet((s) => s.show);
  const { describe } = useRepeatText();
  const today = me ? todayIn(me.timeZone) : undefined;
  const labels = useDateLabels(today);

  // A task that is gone (deleted elsewhere, no longer shared) closes its screen (06-mobile.md, Errors).
  const missing = isApiError(query.error) && query.error.status === 404;
  useEffect(() => {
    if (missing) navigation.goBack();
  }, [missing, navigation]);

  if (!task || !me || !today || !wid) {
    return <Screen edges={['bottom']}>{query.error && !missing ? <Notice>{errorMessage(query.error)}</Notice> : null}</Screen>;
  }

  const locale = i18n.language;
  const completed = task.status === 'completed';
  const overdue = !!task.dueDate && task.dueDate < today && !completed;
  const reminder = reminderOf(task);
  const run = (c: TaskChange) => change.mutate(c);
  const open = (field: TaskField) => showSheet(task.id, field);

  const when = (iso: string) =>
    t('taskDetail.at', {
      date: formatInstant(iso, locale, me.timeZone, { year: 'numeric', month: 'short', day: 'numeric' }),
      time: formatInstant(iso, locale, me.timeZone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }),
    });
  const by = (line: string, who: UserRef | null | undefined) =>
    !who ? line : who.id === me.id ? t('taskDetail.byYou', { line }) : who.displayName ? t('taskDetail.byName', { line, name: who.displayName }) : line;

  const toggleComplete = () => {
    if (completed) return run(taskChanges.reopen());
    run(taskChanges.complete());
    if (task.repeat?.nextDueDate) useToast.getState().show({ message: t('taskDetail.nextOn', { date: labels.day(task.repeat.nextDueDate) }) });
  };

  const skip = () => {
    run(taskChanges.skip());
    if (task.repeat?.nextDueDate) useToast.getState().show({ message: t('taskDetail.skipped', { date: labels.day(task.repeat.nextDueDate) }) });
  };

  // Deleted once the API agrees; then back to the list with Undo (the task is in Recently Deleted for 30 days).
  const deleteTask = () =>
    remove.mutate(task, {
      onSuccess: () => {
        navigation.goBack();
        useToast.getState().show({ message: t('taskDetail.deleted'), action: { label: t('common.undo'), onPress: () => restoreTask(queryClient, wid, task.id) } });
      },
    });

  const error = change.error ?? remove.error;

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ paddingBottom: space.huge }}>
      {error && (
        <View style={{ marginBottom: space.md }}>
          <Notice>{errorMessage(error)}</Notice>
        </View>
      )}

      <View style={[styles.head, { gap: space.md, paddingTop: space.sm }, task.isImportant && [styles.edge, { borderLeftColor: colors.danger }]]}>
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
        <TitleField key={task.title} title={task.title} completed={completed} onSave={(title) => run(taskChanges.title(title))} />
        <Pressable
          onPress={() => run(taskChanges.important(!task.isImportant))}
          accessibilityRole="switch"
          accessibilityState={{ checked: task.isImportant }}
          accessibilityLabel={t('taskDetail.important')}
          style={styles.flag}
        >
          <Feather name="flag" size={22} color={task.isImportant ? colors.danger : colors.ink3} />
        </Pressable>
      </View>

      {completed && (
        <View style={[styles.doneNote, { gap: space.md }]}>
          <Text variant="footnote" color="ink2" style={styles.fill}>
            {task.completedAt ? by(t('taskDetail.completed', { when: when(task.completedAt) }), task.completedBy) : ''}
          </Text>
          <Button variant="link" title={t('taskDetail.reopen')} onPress={() => run(taskChanges.reopen())} />
        </View>
      )}

      <View style={{ marginTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }}>
        <ListRow
          label={t('taskDetail.fields.collection')}
          icon={<CollectionIcon collection={task.collection} />}
          value={<Text variant="bodyMedium" color="accent" numberOfLines={1}>{task.collection.name}</Text>}
          onPress={() => open('collection')}
        />
        {task.dueDate ? (
          <ListRow
            label={t('taskDetail.fields.due')}
            icon={<Feather name="calendar" size={20} color={colors.accent} />}
            value={<Text variant="bodyMedium" color={overdue ? 'danger' : 'accent'}>{overdue ? t('taskDetail.overdue', { date: labels.day(task.dueDate) }) : labels.day(task.dueDate)}</Text>}
            onPress={() => open('due')}
            onClear={() => run(taskChanges.due(undefined))}
            clearLabel={t('taskDetail.clearDue')}
          />
        ) : (
          <ListRow label={t('taskDetail.fields.due')} value={t('common.none')} icon={<Feather name="calendar" size={20} color={colors.ink3} />} onPress={() => open('due')} />
        )}
        {reminder ? (
          <ListRow
            label={t('taskDetail.fields.reminder')}
            icon={<Feather name="bell" size={20} color={colors.accent} />}
            value={
              <View style={styles.end}>
                <Text variant="bodyMedium" color="accent">{reminder.date === today ? `${t('dates.today')}, ${labels.time(reminder.time)}` : labels.reminder(reminder)}</Text>
                <Text variant="caption" color="ink2">{t('reminders.onlyYou')}</Text>
              </View>
            }
            onPress={() => open('reminder')}
            onClear={() => run(taskChanges.reminder(null))}
            clearLabel={t('reminders.remove')}
          />
        ) : (
          <ListRow label={t('taskDetail.fields.reminder')} value={t('common.none')} icon={<Feather name="bell" size={20} color={colors.ink3} />} onPress={() => open('reminder')} />
        )}
        {task.repeat ? (
          <ListRow
            label={t('taskDetail.fields.repeat')}
            icon={<Feather name="repeat" size={20} color={colors.accent} />}
            value={<Text variant="bodyMedium" color="accent" numberOfLines={2}>{describe(task.repeat, task.dueDate)}</Text>}
            onPress={() => open('repeat')}
            onClear={() => run(taskChanges.repeat(null, today))}
            clearLabel={t('taskDetail.clearRepeat')}
          />
        ) : (
          <ListRow label={t('taskDetail.fields.repeat')} value={t('common.none')} icon={<Feather name="repeat" size={20} color={colors.ink3} />} onPress={() => open('repeat')} />
        )}
        <TagsRow
          tags={task.tags.map((g) => ({ name: g.name, color: g.color }))}
          onPress={() => open('tags')}
          onClear={task.tags.length ? () => run(taskChanges.tags(wid, [], [])) : undefined}
        />
      </View>

      {task.repeat?.nextDueDate && !completed && (
        <View style={styles.start}>
          <Button variant="link" title={t('taskDetail.skip', { date: labels.day(task.repeat.nextDueDate) })} onPress={skip} />
        </View>
      )}

      <StepList
        steps={task.steps}
        canAdd={!completed}
        onToggle={(step) => run(taskChanges.toggleStep(step))}
        onRename={(step, title) => run(taskChanges.renameStep(step, title))}
        onDelete={(step) => run(taskChanges.deleteStep(step))}
        onAdd={(title) => run(taskChanges.addStep(title))}
      />

      <NotesField key={task.notes ?? ''} notes={task.notes ?? ''} onSave={(notes) => run(taskChanges.notes(notes))} />

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
    </Screen>
  );
}

/** The title, edited in place; typed text stays here (docs/performance.md, rule 2) and saves when editing ends. */
function TitleField({ title, completed, onSave }: { title: string; completed: boolean; onSave(title: string): void }) {
  const { t } = useTranslation();
  const { colors, type } = useTheme();
  const [text, setText] = useState(title);
  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) setText(title);   // a title can't be blank: put it back
    else if (trimmed !== title) onSave(trimmed);
  };
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onEndEditing={save}
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

/** Plain-text notes, edited in place; saved when editing ends (empty clears them). */
function NotesField({ notes, onSave }: { notes: string; onSave(notes: string): void }) {
  const { t } = useTranslation();
  const { colors, radius, space, type } = useTheme();
  const [text, setText] = useState(notes);
  return (
    <View style={{ marginTop: space.xxl, gap: space.sm }}>
      <Text variant="label" color="ink2" accessibilityRole="header">
        {t('taskDetail.notes')}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => text.trim() !== notes.trim() && onSave(text.trim())}
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
});
