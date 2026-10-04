import type { Id, LocalDate, Version } from '@/core/types';

export type SortMode = 'manual' | 'dueDate' | 'important' | 'title' | 'created';

/** An item of GET /collections?workspaceId=: Inbox first, then the sidebar order. */
export interface Collection {
  id: Id;
  workspaceId: Id;
  name: string;
  /** "#4A90E2": user data, not a palette color. */
  color: string;
  icon: string | null;
  isInbox: boolean;
  sortMode: SortMode;
  showCompleted: boolean;
  isArchived: boolean;
  version: Version;
  openTasks?: number;
}

/** An item of GET /tags?workspaceId=. */
export interface Tag {
  id: Id;
  workspaceId: Id;
  name: string;
  color: string | null;
  version: Version;
  openTasks?: number;
}

/** POST /tasks. `#tags` in the title are applied (created when new) and removed from it. */
export interface CreateTaskRequest {
  /** The collection; or omit it and send `workspaceId` for that workspace's Inbox. */
  collectionId?: Id;
  workspaceId?: Id;
  title: string;
  notes?: string;
  dueDate?: LocalDate;
  /** The Important flag; omitted = not important. */
  isImportant?: boolean;
  /** The caller's reminder; both or neither. Omitted with a due date: 9:00 on the due date (D31). */
  reminderDate?: LocalDate;
  reminderTime?: string;
}

/** The fields of a task the app reads so far. */
export interface Task {
  id: Id;
  workspaceId: Id;
  collectionId: Id;
  title: string;
  notes: string | null;
  isImportant: boolean;
  dueDate: LocalDate | null;
  tagIds: Id[];
  version: Version;
}

export type TaskStatus = 'open' | 'completed';
export type AssignmentStatus = 'pending' | 'accepted';

/** A task in a list (TaskSummaryResponse): enough for one row. */
export interface TaskSummary {
  id: Id;
  collectionId: Id;
  title: string;
  hasNotes: boolean;
  isImportant: boolean;
  dueDate: LocalDate | null;
  repeats: boolean;
  status: TaskStatus;
  completedAt: string | null;
  assigneeId: Id | null;
  assignmentStatus: AssignmentStatus | null;
  stepsDone: number;
  stepsTotal: number;
  tagIds: Id[];
  version: Version;
}

/** GET /tasks (D51, D52): a keyset page; `total` on the first page only. */
export interface TaskPage {
  items: TaskSummary[];
  nextCursor: string | null;
  total: number | null;
}

export type DueFilter = 'overdue' | 'today' | 'upcoming' | 'none';

/** GET /tasks: the scope (one of workspaceId, collectionId) and filters, combined with AND. */
export interface TaskFilter {
  workspaceId?: Id;
  collectionId?: Id;
  status?: TaskStatus;
  important?: boolean;
  due?: DueFilter[];
  dueFrom?: LocalDate;
  dueTo?: LocalDate;
  tagId?: Id;
  /** 'me', 'none' or a user id. */
  assignee?: string;
  assignment?: AssignmentStatus;
  /** `collection`: the collection's own order (default with collectionId). */
  sort?: 'due' | 'created' | 'collection';
  limit?: number;
}

/** PATCH /tasks/{id}: only what is sent changes; null clears. */
export interface UpdateTaskRequest {
  title?: string;
  notes?: string | null;
  dueDate?: LocalDate | null;
  isImportant?: boolean;
}

/** API limits (TaskLimits.cs). */
export const taskLimits = { titleMax: 500, notesMax: 10_000 } as const;

export const TaskErrorCodes = {
  /** The title had only #tags. */
  titleOnlyTags: 'task.title_only_tags',
} as const;
