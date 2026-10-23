import type { Id, LocalDate, Version } from '@/core/types';

/** Manual puts new, reopened and moved tasks on top (D85, M60). */
export type SortMode = 'manual' | 'dueDate' | 'important' | 'alphabetical';

/** `private`: only its owner; `shared`: its own members; `team`: in a team (D57). */
export type Sharing = 'private' | 'shared' | 'team';
/** The caller's rights: `admin` manages it through its team. */
export type TaskListRole = 'owner' | 'admin' | 'member';

/** An item of GET /task-lists: every task list the caller can see, Inbox first, then their own order (D57, D61). */
export interface TaskList {
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
  role: TaskListRole;
  version: Version;
  openTasks?: number;
  /** Completed tasks in it (GET /task-lists): a list offers Show completed only when there are some. */
  completedTasks?: number;
  /** Tasks on hold in it (D91): its On hold section shows only when there are some. */
  onHoldTasks?: number;
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

/** What a tag rename, merge or delete changes: the caller's tasks, and how many of them other people see too. */
export interface TagChange {
  tasks: number;
  sharedTasks: number;
  taskIds: Id[];
}

/** POST /tasks. The title is plain text: `#name` in it is not a tag (D60, M31). */
export interface CreateTaskRequest {
  /** A UUIDv7 the app picks, so the row it shows at once keeps its key (M100). */
  id?: Id;
  /** The task list; omitted: the caller's Inbox, created on first need (D59). */
  taskListId?: Id;
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

/** A task's task list; `team` is set for a team's task list ("Q3 launch · Design"). */
export interface TaskListRef {
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

/** `onHold` (D91): can't go on for now, with a reason; only on shared and team lists. */
export type TaskStatus = 'open' | 'completed' | 'onHold';
/** Declined stays on the task, with the reason, until whoever assigned it decides (D71). */
export type AssignmentStatus = 'pending' | 'accepted' | 'declined';

/**
 * GET /tasks/{id} (TaskResponse); times are UTC ISO-8601. Missing keys are null (the API omits nulls). `taskList` is null
 * for someone who sees the task only as its assignee: `assignedBy` says who it's from (D70).
 */
export interface Task {
  id: Id;
  taskList: TaskListRef | null;
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
  declineReason?: string | null;
  /** Completed by its assignee for the caller, who hasn't confirmed it yet (D71). */
  awaitsConfirmation: boolean;
  confirmedAt?: string | null;
  confirmedBy?: UserRef | null;
  /** Given by email to someone without an account yet (D70); only for those who see the list. */
  invitedEmail?: string | null;
  steps: Step[];
  tags: TagRef[];
  createdAt: string;
  createdBy?: UserRef | null;
  updatedAt?: string | null;
  updatedBy?: UserRef | null;
  version: Version;
  /** On hold (D91): why, until when, who paused it and when, who is told to resume it. */
  holdReason?: string | null;
  holdUntil?: LocalDate | null;
  heldBy?: UserRef | null;
  heldAt?: string | null;
  resumer?: UserRef | null;
  /** Its comments (D92): the thread shows on a shared task or one that has some. */
  commentCount?: number;
}

/** A task in a list (TaskSummaryResponse): enough for one row. `taskList`, `declineReason`, `awaitsConfirmation`, `invitedEmail`: as on Task. */
export interface TaskSummary {
  id: Id;
  taskList: TaskListRef | null;
  title: string;
  hasNotes: boolean;
  isImportant: boolean;
  dueDate: LocalDate | null;
  repeats: boolean;
  status: TaskStatus;
  completedAt: string | null;
  assignee?: UserRef | null;
  assignmentStatus: AssignmentStatus | null;
  assignedBy?: UserRef | null;
  declineReason?: string | null;
  awaitsConfirmation: boolean;
  invitedEmail?: string | null;
  stepsDone: number;
  stepsTotal: number;
  tags: TagRef[];
  version: Version;
  /** The caller's own reminder (D67): the Today tab shows its time. */
  reminder?: Reminder | null;
  /** On hold (D91): why it waits, until when, who can resume it. */
  holdReason?: string | null;
  holdUntil?: LocalDate | null;
  resumer?: UserRef | null;
  /** Its comments (D92), shown on the row. */
  commentCount?: number;
  /** The assignee who gave it back, for whoever had given it: Home's follow-up (D100). */
  droppedBy?: UserRef | null;
}

/** GET /tasks (D51, D52): a keyset page; `total` on the first page only. */
export interface TaskPage {
  items: TaskSummary[];
  nextCursor: string | null;
  total: number | null;
}

export type DueFilter = 'overdue' | 'today' | 'upcoming' | 'none';

/**
 * GET /tasks (D51, D61): everything the caller can see unless narrowed by `taskListId` or `teamId`; `mine` keeps the
 * caller's own tasks (Inbox, private task lists, assigned to them). Filters combine with AND.
 */
export interface TaskFilter {
  taskListId?: Id;
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
  /** Tasks the caller gave someone else (D88), open and completed ones waiting for their confirmation. */
  assignedBy?: 'me';
  /** `taskList` (default with taskListId): open tasks in its own order, whole; completed newest first, paged. */
  sort?: 'due' | 'created' | 'taskList';
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
  /** Another task list the caller can see. */
  taskListId?: Id;
  /** The caller's reminder ("HH:mm"); null removes it. With a first due date it replaces the automatic 9:00 one. */
  reminder?: { date: LocalDate; time: string } | null;
  /** Tag names, exactly these; new names are created. */
  tags?: string[];
  /** The steps in order, exactly these: with an id kept, without one new, missing ones deleted. */
  steps?: { id?: Id; title: string; isDone: boolean }[];
}

/** An item of GET /recently-deleted (D54): restore it with its version as If-Match. Times are UTC ISO-8601. */
export interface DeletedItem {
  kind: 'task' | 'taskList' | 'team';
  id: Id;
  name: string;
  deletedAt: string;
  restorableUntil: string;
  canRestore: boolean;
  version: Version;
  taskListId?: Id | null;
  /** The tasks a task list takes with it. */
  taskCount?: number | null;
}

/**
 * An invitation waiting for the caller (GET /invitations, D67): a team's (`teamId`) or a task list's (`taskListId`),
 * who invited them, the people in it, and its open tasks (a task list) or lists (a team).
 */
export interface MyInvitation {
  id: Id;
  teamId?: Id | null;
  taskListId?: Id | null;
  name: string;
  invitedBy?: UserRef | null;
  people: number;
  openTasks?: number | null;
  lists?: number | null;
  /** UTC ISO-8601. */
  expiresAt: string;
}

/** Home's task sections (GET /home/{section}, D67, D86). */
export type HomeSection = 'to-answer' | 'follow-up' | 'overdue' | 'today' | 'coming-up' | 'assigned' | 'important' | 'inbox' | 'holds';

/** GET /home (D67, D69, D86): Home's invitations, each section's first page, and the totals behind its cards. */
export interface Home {
  invitations: MyInvitation[];
  toAnswer: TaskPage;
  /** Tasks the caller assigned that were declined or dropped (D100), or completed and wait for them to confirm (D71). */
  followUp: TaskPage;
  overdue: TaskPage;
  today: TaskPage;
  comingUp: TaskPage;
  /** Accepted tasks others gave the caller, past Coming up or undated: not in any section above (D86). */
  assigned: TaskPage;
  /** Today's tasks already completed: "2 of 9 done" with `today.total` (D86). */
  doneToday: number;
  importantTotal: number;
  inboxTotal: number;
  /** Every open task the caller can see; 0 with nothing to answer is a new user's first day (M51). */
  openTotal: number;
  /** Tasks on hold whose Until has come, for the caller to resume (D91): with Requests. */
  holds: TaskPage;
}

export type TeamRole = 'owner' | 'admin' | 'member';

/** An item of GET /teams: a team the caller is in; `role` is theirs, `members` how many people (D57). */
export interface Team {
  id: Id;
  name: string;
  owner: UserRef;
  role: TeamRole;
  members: number;
  version: Version;
}

/**
 * Someone who sees a team or a task list (GET …/members). `role`: owner, admin or member. `isGuest`: in a team's
 * task list without being in the team; `isOutsider`: from another account.
 */
/** Someone to pick without an email (GET /people, D89): `via` a list or team you share; `colleague` in your company. */
export interface Person {
  id: Id;
  displayName: string;
  via: string | null;
  colleague: boolean;
}

export interface Member {
  userId: Id;
  displayName: string;
  email: string;
  role: TeamRole;
  isGuest: boolean;
  isOutsider: boolean;
  joinedAt: string;
  /** Workload (D90, M79): open tasks assigned to them in the team's lists (or the list without a team), and those overdue. */
  openTasks: number;
  overdueTasks: number;
}

/** An open invitation, as the people who invite see it (GET …/invitations). UTC ISO-8601. */
export interface OpenInvitation {
  id: Id;
  teamId?: Id | null;
  taskListId?: Id | null;
  email: string;
  expiresAt: string;
  invitedBy?: Id | null;
}

/** Whose people: a team's or a task list's. */
export type MembersOf = { kind: 'team' | 'taskList'; id: Id };

/** POST /task-lists: private, or in a team the caller is in. */
export interface CreateTaskListRequest {
  name: string;
  color: string;
  teamId?: Id;
  /** Omitted: manual (D106). */
  sortMode?: SortMode;
}

/** PATCH /task-lists/{id}: only what is sent changes. */
export interface UpdateTaskListRequest {
  name?: string;
  color?: string;
  sortMode?: SortMode;
  showCompleted?: boolean;
}

/** One of the caller's upcoming reminders (GET /me/reminders, D11): what the device schedules. Time "HH:mm:ss". */
export interface MyReminder {
  taskId: Id;
  taskListId: Id;
  title: string;
  dueDate?: LocalDate | null;
  date: LocalDate;
  time: string;
}

/** API limits (TaskLimits.cs). */
export const taskLimits = { titleMax: 500, notesMax: 10_000, stepTitleMax: 500, stepsMax: 100, rejectReasonMax: 500, taskListNameMax: 100, commentMax: 2_000 } as const;


/**
 * A comment on a task (D92). `body` keeps mentions as `@{userId}` tokens, named in `mentions`; `canEdit`: the user wrote
 * it; `canDelete`: wrote it, or manages the list. Times are UTC.
 */
export interface Comment {
  id: Id;
  author: UserRef;
  body: string;
  mentions: UserRef[];
  createdAt: string;
  editedAt?: string | null;
  canEdit: boolean;
  canDelete: boolean;
}

/** A team's invite link (D95), for its owner and admins. */
export interface InviteLink {
  url: string;
  code: string;
  expiresAt: string;
}

/**
 * What a link opens, before joining (D95): a team (its invite link or an email), a list or a task given by email. Never
 * who the members are. `email`: the address an invitation went to; `member`: the user is already in it.
 */
export interface LinkPreview {
  kind: 'team' | 'taskList' | 'task';
  teamId?: Id | null;
  taskListId?: Id | null;
  taskId?: Id | null;
  name: string;
  invitedBy?: string | null;
  people?: number | null;
  lists?: number | null;
  openTasks?: number | null;
  expiresAt: string;
  email?: string | null;
  member: boolean;
}

/** What changed on a task (D94). */
export type HistoryKind =
  | 'created' | 'renamed' | 'dueChanged' | 'importance' | 'moved' | 'assigned' | 'accepted' | 'declined' | 'completed' | 'reopened'
  | 'skipped' | 'confirmed' | 'held' | 'resumed' | 'deleted' | 'restored' | 'notesEdited' | 'stepsEdited' | 'tagsEdited'
  | 'assigneeLeft' | 'assigneeDeactivated';

/**
 * One change to a task (GET /tasks/{id}/history, D94). `actor` null: nobody did it by hand. `from`/`to` as stored (titles,
 * yyyy-MM-dd, "true"/"false", ids); `fromLabel`/`toLabel` a list's name then (null: the Inbox); `fromUser`/`toUser` the
 * people of an assignment. The app words it.
 */
export interface HistoryEntry {
  id: Id;
  actor?: UserRef | null;
  kind: HistoryKind;
  from?: string | null;
  to?: string | null;
  fromLabel?: string | null;
  toLabel?: string | null;
  fromUser?: UserRef | null;
  toUser?: UserRef | null;
  details?: string | null;
  at: string;
}

export interface HistoryPage {
  items: HistoryEntry[];
  nextCursor: string | null;
}

/** GET /tasks/{id}/comments: newest first, keyset-paged. */
export interface CommentsPage {
  items: Comment[];
  nextCursor: string | null;
}

/**
 * Someone picked by email (D70), before Save: a UserRef whose id is `email:` and the address, so drafts and pickers treat
 * them like anyone else. `assignTarget` turns an id back into what POST :assign takes.
 */
export const emailAssignee = (email: string): UserRef => ({ id: `email:${email}`, displayName: email });
export const isEmailAssignee = (id: string | null | undefined): boolean => !!id?.startsWith('email:');
export const assignTarget = (id: string): string | { email: string } => (isEmailAssignee(id) ? { email: id.slice(6) } : id);
