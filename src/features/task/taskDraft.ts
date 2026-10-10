import type { ReminderAt } from '@/core/dates/reminders';
import type { Id, LocalDate } from '@/core/types';
import { emailAssignee, isEmailAssignee } from '@/data/tasks/types';
import type { AssignmentStatus, CollectionRef, Repeat, Task, UpdateTaskRequest, UserRef } from '@/data/tasks/types';
import type { TagItem } from '@/shared/components';

import { reminderOf } from './reminderOf';

/** A step being edited: `id` once saved; `key` stays the same for a new one. */
export interface DraftStep {
  key: string;
  id?: Id;
  title: string;
  isDone: boolean;
}

/** Everything Task detail edits before Save (M26). */
export interface TaskDraft {
  title: string;
  notes: string;
  isImportant: boolean;
  dueDate: LocalDate | null;
  repeat: Repeat | null;
  /** Null for someone who sees the task only as its assignee (D70): they can't move it. */
  collection: CollectionRef | null;
  /** Who has it (M43); saved with :assign / :unassign after the PATCH, not in it. An email invited (D70) is `emailAssignee`. */
  assignee: UserRef | null;
  reminder: ReminderAt | null;
  tags: TagItem[];
  steps: DraftStep[];
}

export function toDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    notes: task.notes ?? '',
    isImportant: task.isImportant,
    dueDate: task.dueDate ?? null,
    repeat: task.repeat ? { ...task.repeat, nextDueDate: undefined } : null,   // the server's preview, not something to edit
    collection: task.collection,
    assignee: task.assignee ? { id: task.assignee.id, displayName: task.assignee.displayName } : task.invitedEmail ? emailAssignee(task.invitedEmail) : null,
    reminder: reminderOf(task),
    tags: task.tags.map((g) => ({ name: g.name.toLowerCase(), color: g.color })),
    steps: task.steps.map((s) => ({ key: s.id, id: s.id, title: s.title, isDone: s.isDone })),
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The fields the person changed. */
export const changedKeys = (base: TaskDraft, draft: TaskDraft) => (Object.keys(draft) as (keyof TaskDraft)[]).filter((k) => !same(base[k], draft[k]));

/**
 * The PATCH for Save (D56): only what changed. A first due date with no reminder chosen sends `reminder: null`, so the
 * API doesn't add its 9:00 one (M19).
 */
export function patchOf(base: TaskDraft, draft: TaskDraft): UpdateTaskRequest {
  const body: UpdateTaskRequest = {};
  const keys = new Set(changedKeys(base, draft));
  if (keys.has('title')) body.title = draft.title.trim();
  if (keys.has('notes')) body.notes = draft.notes.trim() || null;
  if (keys.has('isImportant')) body.isImportant = draft.isImportant;
  if (keys.has('dueDate')) body.dueDate = draft.dueDate;
  if (keys.has('repeat')) {
    const r = draft.repeat;
    body.repeat = r && { pattern: r.pattern, interval: r.interval, mode: r.mode, ...(r.daysOfWeek?.length ? { daysOfWeek: r.daysOfWeek } : {}), ...(r.dayOfMonth ? { dayOfMonth: r.dayOfMonth } : {}) };
  }
  if (keys.has('collection') && draft.collection) body.collectionId = draft.collection.id;
  if (keys.has('reminder') || (!base.dueDate && draft.dueDate && !draft.reminder)) body.reminder = draft.reminder;
  if (keys.has('tags')) body.tags = draft.tags.map((g) => g.name);
  if (keys.has('steps')) body.steps = draft.steps.map((s) => ({ ...(s.id ? { id: s.id } : {}), title: s.title.trim(), isDone: s.isDone }));
  return body;
}

/**
 * The status to show beside the draft's assignee: the task's own when it's the same person, else what assigning will
 * give (Accepted for yourself, Pending for anyone else); Invited for an email without an account yet (D70).
 */
export const assigneeStatus = (task: Task | null | undefined, assignee: UserRef | null, meId: Id | null | undefined): AssignmentStatus | 'invited' | null =>
  !assignee ? null
  : task?.assignee?.id === assignee.id ? (task.assignmentStatus ?? null)
  : isEmailAssignee(assignee.id) ? (task?.invitedEmail && assignee.id === `email:${task.invitedEmail}` ? 'invited' : 'pending')
  : assignee.id === meId ? 'accepted' : 'pending';

/** The assignee to send on Save: their id, null to unassign, undefined when it didn't change. */
export const assigneeChange = (base: TaskDraft, draft: TaskDraft): Id | null | undefined =>
  base.assignee?.id === draft.assignee?.id ? undefined : (draft.assignee?.id ?? null);

/** After a 412: the latest task, with the person's changes on top. */
export function rebase(task: Task, base: TaskDraft, draft: TaskDraft): TaskDraft {
  const latest = toDraft(task);
  return { ...latest, ...Object.fromEntries(changedKeys(base, draft).map((k) => [k, draft[k]])) };
}
