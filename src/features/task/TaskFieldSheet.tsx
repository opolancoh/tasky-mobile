import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { nowIn } from '@/core/dates/localDate';
import type { ReminderAt } from '@/core/dates/reminders';
import type { Id, LocalDate } from '@/core/types';
import { useChangeTask, type TaskChange } from '@/data/tasks/mutations';
import { useCollections, useTags, useTask } from '@/data/tasks/queries';
import type { Task } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { CollectionPicker, DueDatePicker, ReminderPicker, sortByRecent, TagPicker, useRecentTags, type TagItem } from '@/shared/components';
import { useCurrentWorkspace } from '@/shared/session/useCurrentWorkspace';
import { Sheet } from '@/shared/ui';

import { RepeatPicker } from './components/RepeatPicker';
import { reminderOf } from './reminderOf';
import { taskChanges } from './taskChanges';
import { useTaskSheet, type TaskField } from './taskSheetStore';

const NO_NAMES: string[] = [];

/**
 * Task detail's field pages (M25), one sheet over the screen: Collection, Due date, Reminder, Repeat, Tags. A quick
 * choice applies and closes; a wheel or tag changes apply with Done; Cancel or a tap outside drops them (M21).
 * Mounted once in App; `useTaskSheet` says which task and field.
 */
export function TaskFieldSheet() {
  const taskId = useTaskSheet((s) => s.taskId);
  const session = useTaskSheet((s) => s.session);
  return taskId ? <FieldSheet key={session} taskId={taskId} /> : null;   // each opening starts from the task
}

function FieldSheet({ taskId }: { taskId: Id }) {
  const { t } = useTranslation();
  const open = useTaskSheet((s) => s.open);
  const field = useTaskSheet((s) => s.field);
  const hide = useTaskSheet((s) => s.hide);
  const workspace = useCurrentWorkspace();
  const task = useTask(workspace?.id, taskId).data;
  const me = useMe().data;
  const [now] = useState(() => (me ? nowIn(me.timeZone) : null));   // "now" for this opening, in the profile's zone

  const header = { title: t(`taskDetail.fields.${field}`), left: { label: t('common.cancel'), onPress: hide } };
  if (!task || !workspace || !now) {
    return <Sheet visible={open} onDismiss={hide} dismissLabel={t('common.close')} {...header}>{null}</Sheet>;
  }
  return <FieldPage task={task} workspaceId={workspace.id} field={field} now={now} header={header} open={open} />;
}

interface FieldPageProps {
  task: Task;
  workspaceId: Id;
  field: TaskField;
  now: { date: LocalDate; time: string };
  header: { title: string; left: { label: string; onPress(): void } };
  open: boolean;
}

function FieldPage({ task, workspaceId, field, now, header, open }: FieldPageProps) {
  const { t } = useTranslation();
  const hide = useTaskSheet((s) => s.hide);
  const change = useChangeTask(workspaceId, task.id);
  const collections = useCollections(workspaceId).data ?? [];
  const workspaceTags = useTags(workspaceId).data ?? [];
  const recent = useRecentTags((s) => s.byWorkspace[workspaceId]) ?? NO_NAMES;
  const today = now.date;

  // What a page changes before Done (the wheels, the tag list).
  const [due, setDue] = useState<LocalDate | undefined>(task.dueDate ?? undefined);
  const [reminder, setReminder] = useState<ReminderAt | null>(reminderOf(task));
  const [tags, setTags] = useState<string[]>(task.tags.map((g) => g.name.toLowerCase()));

  // The sheet closes at once; the change carries on (useChangeTask refetches what it touched).
  const apply = (c: TaskChange) => {
    change.mutate(c);
    hide();
  };

  const sortedTags = sortByRecent(workspaceTags, recent);
  const tagItems: TagItem[] = tags.map((n) => sortedTags.find((g) => g.name === n) ?? { name: n, color: null });
  const saveTags = () => {
    const added = tags.filter((n) => !task.tags.some((g) => g.name.toLowerCase() === n));
    if (added.length) useRecentTags.getState().used(workspaceId, added);
    apply(taskChanges.tags(workspaceId, tags, workspaceTags));
  };

  const done: Partial<Record<TaskField, () => void>> = {
    due: () => (due !== (task.dueDate ?? undefined) ? apply(taskChanges.due(due)) : hide()),
    reminder: () => apply(taskChanges.reminder(reminder)),
    tags: saveTags,
  };
  const onDone = done[field];

  return (
    <Sheet
      visible={open}
      onDismiss={hide}
      dismissLabel={t('common.close')}
      {...header}
      right={onDone ? { label: t('common.done'), emphasis: true, onPress: onDone } : undefined}
    >
      {field === 'collection' && (
        <CollectionPicker
          collections={collections}
          selectedId={task.collection.id}
          onPick={(c) => (c.id === task.collection.id ? hide() : apply(taskChanges.move({ id: c.id, name: c.name, color: c.color, isInbox: c.isInbox })))}
        />
      )}
      {field === 'due' && <DueDatePicker value={due} today={today} onPick={(date) => apply(taskChanges.due(date))} onChange={setDue} />}
      {field === 'reminder' && (
        <ReminderPicker value={reminder} onChange={setReminder} onPick={(at) => apply(taskChanges.reminder(at))} onRemove={() => apply(taskChanges.reminder(null))} now={now} />
      )}
      {field === 'repeat' && <RepeatPicker value={task.repeat} due={task.dueDate ?? today} onPick={(p) => apply(taskChanges.repeat(p, today))} />}
      {field === 'tags' && (
        <TagPicker tags={sortedTags} selected={tagItems} onToggle={(name) => setTags((ns) => (ns.includes(name) ? ns.filter((n) => n !== name) : [...ns, name]))} />
      )}
    </Sheet>
  );
}
