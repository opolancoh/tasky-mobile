import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { nowIn } from '@/core/dates/localDate';
import type { ReminderAt } from '@/core/dates/reminders';
import type { LocalDate } from '@/core/types';
import { taskKeys } from '@/data/tasks/keys';
import { useTaskLists, useTags } from '@/data/tasks/queries';
import type { RepeatPattern, Task } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { givesOutside, AssigneePicker, TaskListPicker, DueDatePicker, ReminderPicker, RepeatPicker, sortByRecent, TagPicker, useRecentTags, type TagItem } from '@/shared/components';
import { useSessionStore } from '@/shared/session/sessionStore';
import { confirm, Sheet } from '@/shared/ui';

import { assigneeStatus, type TaskDraft } from './taskDraft';
import { useTaskDraft } from './taskDraftStore';
import { useTaskSheet, type TaskField } from './taskSheetStore';

const NO_NAMES: string[] = [];

/**
 * Task detail's field pages (M25, M26), one sheet over the screen: Task list, Due date, Reminder, Repeat, Tags. They
 * change the draft, which Save sends: a quick choice applies and closes, the wheels and tag changes apply with Done,
 * Cancel or a tap outside drops them (M21). Mounted once in App; `useTaskSheet` says which field.
 */
export function TaskFieldSheet() {
  const session = useTaskSheet((s) => s.session);
  const hasDraft = useTaskDraft((s) => !!s.draft);   // not the draft itself: typing in the screen mustn't redraw the sheet
  return hasDraft ? <FieldSheet key={session} /> : null;   // each opening starts from the draft as it is then
}

function FieldSheet() {
  const [draft] = useState(() => useTaskDraft.getState().draft!);
  const { t } = useTranslation();
  const open = useTaskSheet((s) => s.open);
  const field = useTaskSheet((s) => s.field);
  const hide = useTaskSheet((s) => s.hide);
  const edit = useTaskDraft((s) => s.edit);
  const me = useMe().data;
  // "Now" for this opening, in the profile's zone; set once the profile is in, so a page never stays blank.
  const [now, setNow] = useState(() => (me ? nowIn(me.timeZone) : null));
  if (!now && me) setNow(nowIn(me.timeZone));

  // What a page changes before Done (the wheels, the tag list).
  const [due, setDue] = useState<LocalDate | null>(draft.dueDate);
  const [reminder, setReminder] = useState<ReminderAt | null>(draft.reminder);
  const [tags, setTags] = useState<TagItem[]>(draft.tags);

  const apply = (changes: Partial<TaskDraft>) => {
    edit(changes);
    hide();
  };
  // Clearing the due date stops a repeat too: a repeat needs a due date.
  const applyDue = (dueDate: LocalDate | null) => apply({ dueDate, ...(dueDate ? {} : { repeat: null }) });

  const done: Partial<Record<TaskField, () => void>> = {
    due: () => applyDue(due),
    reminder: () => apply({ reminder }),
    tags: () => apply({ tags }),
  };
  const onDone = done[field];
  const header = {
    title: t(`taskDetail.fields.${field}`),
    left: { label: t('common.cancel'), onPress: hide },
    right: onDone ? { label: t('common.done'), emphasis: true, onPress: onDone } : undefined,
  };

  return (
    <Sheet visible={open} onDismiss={hide} dismissLabel={t('common.close')} {...header}>
      {now && (
        <Page field={field} draft={draft} now={now} due={due} setDue={setDue} reminder={reminder} setReminder={setReminder} tags={tags} setTags={setTags} apply={apply} applyDue={applyDue} />
      )}
    </Sheet>
  );
}

interface PageProps {
  field: TaskField;
  draft: TaskDraft;
  now: { date: LocalDate; time: string };
  due: LocalDate | null;
  setDue(date: LocalDate): void;
  reminder: ReminderAt | null;
  setReminder(at: ReminderAt): void;
  tags: TagItem[];
  setTags(change: (tags: TagItem[]) => TagItem[]): void;
  apply(changes: Partial<TaskDraft>): void;
  applyDue(date: LocalDate | null): void;
}

function Page({ field, draft, now, due, setDue, reminder, setReminder, tags, setTags, apply, applyDue }: PageProps) {
  const { t } = useTranslation();
  const taskListsQuery = useTaskLists();
  const tagsQuery = useTags();
  const userId = useSessionStore((s) => s.userId);
  const taskLists = taskListsQuery.data ?? [];
  const myTags = tagsQuery.data ?? [];
  const recent = useRecentTags((s) => (userId ? s.byUser[userId] : undefined)) ?? NO_NAMES;
  const today = now.date;
  const taskId = useTaskDraft((s) => s.taskId);
  const task = useQueryClient().getQueryData<Task>(taskKeys.detail(taskId ?? ''));
  const assignmentStatus = assigneeStatus(task, draft.assignee, userId);

  switch (field) {
    case 'taskList':
      return (
        <TaskListPicker
          taskLists={taskLists}
          loading={taskListsQuery.isPending}
          selectedId={draft.taskList?.id}
          // Personal is only yours: whoever had the task loses it there, after asking. Into a private list of yours a task
          // assigned to you is simply yours; anyone else keeps it, seeing only that task (D70, D109). The API drops them too.
          onPick={async (c) => {
            const who = draft.assignee;
            const drop = !!who && (c.isInbox || (c.sharing === 'private' && who.id === userId));
            if (drop && c.isInbox && who.id !== userId && !(await confirm({ title: t('taskDetail.dropAssigneeTitle'), message: t('taskDetail.dropAssigneeMessage', { name: who.displayName.split(' ')[0] }), confirmLabel: t('taskDetail.dropAssigneeConfirm'), cancelLabel: t('common.cancel'), destructive: false }))) return;
            apply({ taskList: { id: c.id, name: c.name, color: c.color, isInbox: c.isInbox, team: c.team }, ...(drop ? { assignee: null } : {}) });
          }}
        />
      );
    case 'assignee':
      return userId && draft.taskList ? (
        <AssigneePicker
          taskListId={draft.taskList.id}
          canGiveOutside={givesOutside(taskLists.find((c) => c.id === draft.taskList?.id), userId)}
          meId={userId}
          selected={draft.assignee}
          status={assignmentStatus}
          onPick={(assignee) => apply({ assignee })}
        />
      ) : null;
    case 'due':
      return <DueDatePicker value={due ?? undefined} today={today} onPick={(date) => applyDue(date ?? null)} onChange={setDue} />;
    case 'reminder':
      return <ReminderPicker value={reminder} onChange={setReminder} onPick={(at) => apply({ reminder: at })} onRemove={() => apply({ reminder: null })} now={now} due={draft.dueDate} />;
    case 'repeat':
      return (
        <RepeatPicker
          value={draft.repeat}
          due={draft.dueDate ?? today}
          // A plain rule on the due date (today when there is none: a repeat needs one).
          onPick={(pattern: RepeatPattern | null) =>
            apply(pattern ? { repeat: { pattern, interval: 1, mode: 'fromDueDate' }, dueDate: draft.dueDate ?? today } : { repeat: null })
          }
        />
      );
    case 'tags': {
      const sorted = sortByRecent(myTags, recent);
      return (
        <TagPicker
          tags={sorted}
          loading={tagsQuery.isPending}
          selected={tags}
          onToggle={(name) =>
            setTags((ts) => (ts.some((g) => g.name === name) ? ts.filter((g) => g.name !== name) : [...ts, sorted.find((g) => g.name === name) ?? { name, color: null }]))
          }
        />
      );
    }
  }
}
