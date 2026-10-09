import type { Id, LocalDate, Version } from '@/core/types';

export type SortMode = 'manual' | 'dueDate' | 'important' | 'alphabetical' | 'created';

/** `private`: only its owner; `shared`: its own members; `team`: in a team (D57). */
export type Sharing = 'private' | 'shared' | 'team';
/** The caller's rights: `admin` manages it through its team. */
export type CollectionRole = 'owner' | 'admin' | 'member';

/** An item of GET /collections: every collection the caller can see, Inbox first, then their own order (D57, D61). */
export interface Collection {
  id: Id;
  name: string;
  /** "#4A90E2": user data, not a palette color. */
  color: string;
  icon: string | null;
  isInbox: boolean;
  sortMode: SortMode;
  showCompleted: boolean;
  isArchived: boolean;
  owner: UserRef;
  team?: TeamRef | null;
  sharing: Sharing;
  role: CollectionRole;
  version: Version;
  openTasks?: number;
}

/**
 * An item of GET /tags (D60): a tag is a name; the caller's tags are the ones they created plus the ones on tasks they
 * can see. `color` is the caller's own (null: gray); `isOwn`: created or colored by them.
 */
export interface Tag {
  name: string;
  color: string | null;
  openTasks: number;
  isOwn: boolean;
}

/** POST /tasks. The title is plain text: `#name` in it is not a tag (D60, M31). */
export interface CreateTaskRequest {
  /** The collection; omitted: the caller's Inbox, created on first need (D59). */
  collectionId?: Id;
  title: string;
  notes?: string;
  dueDate?: LocalDate;
  /** The Important flag; omitted = not important. */
  isImportant?: boolean;
  /** Tag names (at most 10); new names become the caller's tags too. */
  tags?: string[];
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

export interface TeamRef {
  id: Id;
  name: string;
}

/** A task's collection; `team` is set for a team's collection ("Q3 launch · Design"). */
export interface CollectionRef {
  id: Id;
  name: string;
  /** "#4A90E2": user data, not a palette color. */
  color: string;
  isInbox: boolean;
  team?: TeamRef | null;
}

/** A tag on a task (D60): its name, and the caller's own color for it (null: gray). */
export interface TagRef {
  name: string;
  color: string | null;
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
  /** The caller's own reminder (D67): Home's Today shows its time. */
  reminder?: Reminder | null;
}

/** GET /tasks (D51, D52): a keyset page; `total` on the first page only. */
export interface TaskPage {
  items: TaskSummary[];
  nextCursor: string | null;
  total: number | null;
}

export type DueFilter = 'overdue' | 'today' | 'upcoming' | 'none';

/**
 * GET /tasks (D51, D61): everything the caller can see unless narrowed by `collectionId` or `teamId`; `mine` keeps the
 * caller's own tasks (Inbox, private collections, assigned to them). Filters combine with AND.
 */
export interface TaskFilter {
  collectionId?: Id;
  teamId?: Id;
  mine?: boolean;
  status?: TaskStatus;
  important?: boolean;
  due?: DueFilter[];
  dueFrom?: LocalDate;
  dueTo?: LocalDate;
  /** A tag name. */
  tag?: string;
  /** 'me', 'none' or a user id. */
  assignee?: string;
  assignment?: AssignmentStatus;
  /** `collection` (default with collectionId): open tasks in its own order, whole; completed newest first, paged. */
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
  /** Another collection the caller can see. */
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
  kind: 'task' | 'collection' | 'team';
  id: Id;
  name: string;
  canRestore: boolean;
  version: Version;
}

/**
 * An invitation waiting for the caller (GET /invitations, D67): a team's (`teamId`) or a collection's (`collectionId`),
 * who invited them, the people in it, and its open tasks (a collection) or lists (a team).
 */
export interface MyInvitation {
  id: Id;
  teamId?: Id | null;
  collectionId?: Id | null;
  name: string;
  invitedBy?: UserRef | null;
  people: number;
  openTasks?: number | null;
  lists?: number | null;
  /** UTC ISO-8601. */
  expiresAt: string;
}

/** Home's task sections (GET /home/{section}, D67). */
export type HomeSection = 'to-answer' | 'overdue' | 'today' | 'coming-up' | 'important' | 'inbox' | 'shared';

/** GET /home (D67): invitations, each section's first page, and the totals behind the chips and the shared line. */
export interface Home {
  invitations: MyInvitation[];
  toAnswer: TaskPage;
  overdue: TaskPage;
  today: TaskPage;
  comingUp: TaskPage;
  importantTotal: number;
  inboxTotal: number;
  sharedTotal: number;
}

/** API limits (TaskLimits.cs). */
export const taskLimits = { titleMax: 500, notesMax: 10_000, stepTitleMax: 500, stepsMax: 100, rejectReasonMax: 500 } as const;

