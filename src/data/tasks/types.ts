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

// References the UI shows come as objects: id, label and what drawing them needs (D55).

/** A person a task points to; `displayName` is "" when their profile can't be read. */
export interface UserRef {
  id: Id;
  displayName: string;
}

export interface CollectionRef {
  id: Id;
  name: string;
  /** "#4A90E2": user data, not a palette color. */
  color: string;
  isInbox: boolean;
}

export interface TagRef {
  id: Id;
  name: string;
  color: string;
}

export interface Step {
  id: Id;
  title: string;
  isDone: boolean;
}

export type RepeatPattern = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
export type RepeatMode = 'fromDueDate' | 'fromCompletion';
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface Repeat {
  pattern: RepeatPattern;
  interval: number;
  daysOfWeek?: DayOfWeek[] | null;
  dayOfMonth?: number | null;
  mode: RepeatMode;
  /** Where completing or skipping it today would move the due date. */
  nextDueDate?: LocalDate | null;
}

/** The caller's own reminder; time "09:00:00". */
export interface Reminder {
  date: LocalDate;
  time: string;
}

export type TaskStatus = 'open' | 'completed';
export type AssignmentStatus = 'pending' | 'accepted';

/** GET /tasks/{id} (TaskResponse); times are UTC ISO-8601. Missing keys are null (the API omits nulls). */
export interface Task {
  id: Id;
  workspaceId: Id;
  collection: CollectionRef;
  title: string;
  notes?: string | null;
  isImportant: boolean;
  dueDate?: LocalDate | null;
  repeat?: Repeat | null;
  reminder?: Reminder | null;
  status: TaskStatus;
  completedAt?: string | null;
  completedBy?: UserRef | null;
  assignee?: UserRef | null;
  assignmentStatus?: AssignmentStatus | null;
  assignedBy?: UserRef | null;
  steps: Step[];
  tags: TagRef[];
  createdAt: string;
  createdBy?: UserRef | null;
  updatedAt?: string | null;
  updatedBy?: UserRef | null;
  version: Version;
}

/** A task in a list (TaskSummaryResponse): enough for one row. */
export interface TaskSummary {
  id: Id;
  collection: CollectionRef;
  title: string;
  hasNotes: boolean;
  isImportant: boolean;
  dueDate: LocalDate | null;
  repeats: boolean;
  status: TaskStatus;
  completedAt: string | null;
  assignee?: UserRef | null;
  assignmentStatus: AssignmentStatus | null;
  stepsDone: number;
  stepsTotal: number;
  tags: TagRef[];
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

/** How a task repeats; interval 1 and "from the due date" when omitted. A repeat needs a due date. */
export interface RepeatRequest {
  pattern: RepeatPattern;
  interval?: number;
  daysOfWeek?: DayOfWeek[];
  dayOfMonth?: number;
  mode?: RepeatMode;
}

/** PATCH /tasks/{id}: only what is sent changes, in one transaction (D56); null clears. */
export interface UpdateTaskRequest {
  title?: string;
  notes?: string | null;
  dueDate?: LocalDate | null;
  isImportant?: boolean;
  repeat?: RepeatRequest | null;
  /** Another collection of the same workspace. */
  collectionId?: Id;
  /** The caller's reminder ("HH:mm"); null removes it. With a first due date it replaces the automatic 9:00 one. */
  reminder?: { date: LocalDate; time: string } | null;
  /** Tag names, exactly these; new names are created. */
  tags?: string[];
  /** The steps in order, exactly these: with an id kept, without one new, missing ones deleted. */
  steps?: { id?: Id; title: string; isDone: boolean }[];
}

/** An item of GET /recently-deleted (D54): restore it with its version as If-Match. */
export interface DeletedItem {
  kind: 'task' | 'collection' | 'tag';
  id: Id;
  name: string;
  canRestore: boolean;
  version: Version;
}

/** API limits (TaskLimits.cs). */
export const taskLimits = { titleMax: 500, notesMax: 10_000, stepTitleMax: 500, stepsMax: 100 } as const;

export const TaskErrorCodes = {
  /** The title had only #tags. */
  titleOnlyTags: 'task.title_only_tags',
} as const;
