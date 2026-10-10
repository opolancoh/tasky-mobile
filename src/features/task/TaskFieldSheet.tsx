import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { nowIn } from '@/core/dates/localDate';
import type { ReminderAt } from '@/core/dates/reminders';
import type { LocalDate } from '@/core/types';
import { taskKeys } from '@/data/tasks/keys';
import { useCollections, useTags } from '@/data/tasks/queries';
import type { RepeatPattern, Task } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { AssigneePicker, CollectionPicker, DueDatePicker, ReminderPicker, sortByRecent, TagPicker, useRecentTags, type TagItem } from '@/shared/components';
import { useSessionStore } from '@/shared/session/sessionStore';
import { Sheet } from '@/shared/ui';

import { RepeatPicker } from './components/RepeatPicker';
import { assigneeStatus, type TaskDraft } from './taskDraft';
import { useTaskDraft } from './taskDraftStore';
import { useTaskSheet, type TaskField } from './taskSheetStore';

const NO_NAMES: string[] = [];

/**
 * Task detail's field pages (M25, M26), one sheet over the screen: Collection, Due date, Reminder, Repeat, Tags. They
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
  const [now] = useState(() => (me ? nowIn(me.timeZone) : null));   // "now" for this opening, in the profile's zone

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
  const collectionsQuery = useCollections();
  const tagsQuery = useTags();
  const userId = useSessionStore((s) => s.userId);
  const collections = collectionsQuery.data ?? [];
  const myTags = tagsQuery.data ?? [];
  const recent = useRecentTags((s) => (userId ? s.byUser[userId] : undefined)) ?? NO_NAMES;
  const today = now.date;
  const taskId = useTaskDraft((s) => s.taskId);
  const task = useQueryClient().getQueryData<Task>(taskKeys.detail(taskId ?? ''));
  const assignmentStatus = assigneeStatus(task, draft.assignee, userId);

  switch (field) {
    case 'collection':
      return (
        <CollectionPicker
          collections={collections}
          loading={collectionsQuery.isPending}
          selectedId={draft.collection.id}
          // A private list has only you: whoever had the task can't see it there (the API drops them on the move too).
          onPick={(c) => apply({ collection: { id: c.id, name: c.name, color: c.color, isInbox: c.isInbox, team: c.team }, ...(c.isInbox || c.sharing === 'private' ? { assignee: null } : {}) })}
        />
      );
    case 'assignee':
      return userId ? (
        <AssigneePicker
          collectionId={draft.collection.id}
          meId={userId}
          selected={draft.assignee}
          status={assignmentStatus}
          onPick={(assignee) => apply({ assignee })}
        />
      ) : null;
    case 'due':
      return <DueDatePicker value={due ?? undefined} today={today} onPick={(date) => applyDue(date ?? null)} onChange={setDue} />;
    case 'reminder':
      return <ReminderPicker value={reminder} onChange={setReminder} onPick={(at) => apply({ reminder: at })} onRemove={() => apply({ reminder: null })} now={now} />;
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
