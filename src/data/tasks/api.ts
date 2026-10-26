import type { Id, LocalDate, LocalTime } from '@/core/types';

import { getAll, http, type Page } from '../http';
import type {
  Comment, CommentsPage, HistoryPage, InviteLink, LinkPreview, TaskList, CreateTaskListRequest, CreateTaskRequest, DeletedItem, Home, HomeSection, Member, MembersOf, MyInvitation, Person, MyReminder, OpenInvitation, Step, Tag, TagChange, Task, TaskFilter, TaskPage, TaskSummary, Team, TeamRole,
  UpdateTaskListRequest, UpdateTaskRequest,
} from './types';

/** What a write needs from a task: its id and the version last read (If-Match). */
type Versioned = { id: Id; version: number };

/** A team's or a task list's address: /teams/{id} or /task-lists/{id}. */
const peopleOf = (of: MembersOf) => `/${of.kind === 'team' ? 'teams' : 'task-lists'}/${of.id}`;

export const tasksApi = {
  /** GET /task-lists: every task list the caller can see, Inbox first, with open counts. */
  taskLists: () => getAll<TaskList>('/task-lists'),

  /** GET /task-lists?archived=true: archived ones the caller can see. */
  archivedTaskLists: () => getAll<TaskList>('/task-lists', { archived: true }),

  /** POST /task-lists (201). */
  createTaskList: (body: CreateTaskListRequest) => http().post<TaskList>('/task-lists', { body }),

  /** PATCH /task-lists/{id} with If-Match: name, color, sort (any member). */
  updateTaskList: (c: Versioned, body: UpdateTaskListRequest) => http().patch<TaskList>(`/task-lists/${c.id}`, { body, ifMatch: c.version }),

  /** POST /task-lists/{id}:archive or :unarchive with If-Match (managers). */
  archiveTaskList: (c: Versioned, archive: boolean) => http().post<TaskList>(`/task-lists/${c.id}:${archive ? 'archive' : 'unarchive'}`, { ifMatch: c.version }),

  /** DELETE /task-lists/{id} with If-Match: with its tasks, to Recently Deleted (managers). */
  deleteTaskList: (c: Versioned) => http().delete(`/task-lists/${c.id}`, { ifMatch: c.version }),

  /** POST /task-lists/{id}:restore with the deleted task list's version. */
  restoreTaskList: (item: Versioned) => http().post(`/task-lists/${item.id}:restore`, { ifMatch: item.version }),

  /** POST /task-lists:reorder: the caller's own Browse order (204). */
  reorderTaskLists: (ids: Id[]) => http().post('/task-lists:reorder', { body: { ids } }),

  /** GET /teams: the caller's teams, with their role. */
  teams: () => getAll<Team>('/teams'),

  /** POST /teams: the caller is its owner (201). */
  createTeam: (name: string) => http().post<Team>('/teams', { body: { name } }),

  /** PATCH /teams/{id} with If-Match: rename (owner). */
  renameTeam: (team: Versioned, name: string) => http().patch<Team>(`/teams/${team.id}`, { body: { name }, ifMatch: team.version }),

  /** DELETE /teams/{id} with If-Match: with its task lists (owner). */
  deleteTeam: (team: Versioned) => http().delete(`/teams/${team.id}`, { ifMatch: team.version }),

  /** POST /teams/{id}:restore with the deleted team's version. */
  restoreTeam: (item: Versioned) => http().post(`/teams/${item.id}:restore`, { ifMatch: item.version }),

  /** GET /teams/{id}/members or /task lists/{id}/members. */
  members: (of: MembersOf) => getAll<Member>(`${peopleOf(of)}/members`),

  /** PATCH /teams/{id}/members/{userId}: make someone Admin or Member (owner; 204). */
  changeTeamRole: (teamId: Id, userId: Id, role: Exclude<TeamRole, 'owner'>) => http().patch<void>(`/teams/${teamId}/members/${userId}`, { body: { role } }),

  /** POST /teams/{id}:transfer-ownership with If-Match: another member becomes the owner, the caller Admin (owner). */
  transferTeam: (team: Versioned, userId: Id) => http().post<Team>(`/teams/${team.id}:transfer-ownership`, { body: { userId }, ifMatch: team.version }),

  /** DELETE …/members/{userId}: remove someone; on yourself, leave (204). */
  removeMember: (of: MembersOf, userId: Id) => http().delete(`${peopleOf(of)}/members/${userId}`),

  /** GET …/invitations: open invitations (those who invite). */
  openInvitations: (of: MembersOf) => getAll<OpenInvitation>(`${peopleOf(of)}/invitations`),

  /** POST …/invitations { email } (201). Inviting the same email again replaces the open invitation. */
  invite: (of: MembersOf, email: string) => http().post<OpenInvitation>(`${peopleOf(of)}/invitations`, { body: { email } }),
  /** POST …/invitations { userId } (201): someone from GET /people, or with a task given from the list (D88, D89). */
  inviteUser: (of: MembersOf, userId: Id) => http().post<OpenInvitation>(`${peopleOf(of)}/invitations`, { body: { userId } }),
  /** GET /people: whom the caller can pick without an email (D89), the people they work with most first; `q` searches names (and the start of a known email); `exclude` is left out before the limit (D104). */
  people: (q: string, limit: number, exclude: readonly string[], within: MembersOf | undefined, signal?: AbortSignal) =>
    http().get<Person[]>('/people', { query: { q: q || undefined, limit, exclude: exclude.length ? exclude : undefined, [within?.kind === 'team' ? 'teamId' : 'taskListId']: within?.id }, signal }),
  /** One page of a team's or list's people (D105): the owner, you, admins, then by when they joined; `q` searches names; `total` on the first page. */
  membersPage: (of: MembersOf, opts: { limit: number; cursor?: string; q?: string }, signal?: AbortSignal) =>
    http().get<Page<Member> & { total?: number | null }>(`${peopleOf(of)}/members`, { query: { limit: opts.limit, cursor: opts.cursor, q: opts.q || undefined }, signal }),

  /** DELETE /invitations/{id}: revoke (204). */
  revokeInvitation: (id: Id) => http().delete(`/invitations/${id}`),

  /** GET /tags: the caller's tags, with their color and open counts (D60). */
  tags: () => getAll<Tag>('/tags'),

  /** PUT /tags/{name}: one of the caller's own tags, or its color for them. */
  saveTag: (name: string, color: string | null) => http().put(`/tags/${encodeURIComponent(name)}`, { body: { color } }),

  /**
   * POST /tags/{name}:rename or :merge (a name already in use) on every task the caller can see (D60). `preview` changes
   * nothing and says how many of those tasks other people see too, for the confirmation.
   */
  renameTag: (name: string, to: string, preview = false) =>
    http().post<TagChange>(`/tags/${encodeURIComponent(name)}:rename`, { body: { to }, query: preview ? { preview: true } : undefined }),
  mergeTag: (name: string, into: string, preview = false) =>
    http().post<TagChange>(`/tags/${encodeURIComponent(name)}:merge`, { body: { into }, query: preview ? { preview: true } : undefined }),

  /** DELETE /tags/{name}: off every task the caller can edit; tasks stay (204). */
  deleteTag: (name: string) => http().delete<TagChange>(`/tags/${encodeURIComponent(name)}`),

  /** POST /tags:reorder: the caller's own order (204). */
  reorderTags: (names: string[]) => http().post('/tags:reorder', { body: { names } }),

  /**
   * POST /tasks: a new task at the top of `taskListId`, or of the caller's Inbox (201). Its `id` is also the
   * Idempotency-Key, so sending it again (Try again) never makes a second task.
   */
  createTask: (body: CreateTaskRequest) => http().post<Task>('/tasks', { body, idempotencyKey: body.id }),

  /** GET /tasks/{id}: the full task (D55). */
  get: (taskId: Id) => http().get<Task>(`/tasks/${taskId}`),

  /** GET /tasks (D51, D61): everything the caller can see, narrowed by the filter; keyset-paged, `total` on the first page. */
  list: ({ due, ...filter }: TaskFilter, cursor?: string) => http().get<TaskPage>('/tasks', { query: { ...filter, due: due?.join(','), cursor } }),

  /** PATCH /tasks/{id} with If-Match. */
  update: (task: Versioned, body: UpdateTaskRequest) => http().patch<Task>(`/tasks/${task.id}`, { body, ifMatch: task.version }),

  /** POST /tasks/{id}:complete with If-Match. A repeating task stays open on its next due date. */
  complete: (task: Versioned) => http().post<Task>(`/tasks/${task.id}:complete`, { ifMatch: task.version }),

  /** POST /tasks/{id}:hold with If-Match (D91): put on hold, or change why, until when and who resumes it. */
  hold: (task: Versioned, body: { reason: string; until?: LocalDate | null; resumerId?: Id | null }) =>
    http().post<Task>(`/tasks/${task.id}:hold`, { body, ifMatch: task.version }),

  /** POST /tasks/{id}:resume with If-Match (D91): back to Open, optionally with a new due date. */
  resume: (task: Versioned, dueDate?: LocalDate) => http().post<Task>(`/tasks/${task.id}:resume`, { body: dueDate ? { dueDate } : {}, ifMatch: task.version }),

  /** POST /tasks/{id}:reopen with If-Match. */
  reopen: (task: Versioned) => http().post<Task>(`/tasks/${task.id}:reopen`, { ifMatch: task.version }),

  /** POST /tasks/{id}:skip: a repeating task moves to its next date without a completion. */
  skip: (task: Versioned) => http().post<Task>(`/tasks/${task.id}:skip`, { ifMatch: task.version }),

  /** POST /tasks/{id}:move to the top of another task list the caller can see. */
  move: (task: Versioned, taskListId: Id) => http().post<Task>(`/tasks/${task.id}:move`, { body: { taskListId }, ifMatch: task.version }),

  /** DELETE /tasks/{id}: to Recently Deleted for 30 days (204). */
  remove: (task: Versioned) => http().delete(`/tasks/${task.id}`, { ifMatch: task.version }),

  /** POST /tasks/{id}:restore with the deleted task's version. */
  restore: (item: Versioned) => http().post<Task>(`/tasks/${item.id}:restore`, { ifMatch: item.version }),

  /** GET /search?q= (D32, D61): tasks, open and completed, in everything the caller can see; best match first, keyset-paged. */
  search: (q: string, limit: number, cursor?: string, signal?: AbortSignal) => http().get<{ items: TaskSummary[]; nextCursor: string | null }>('/search', { query: { q, limit, cursor }, signal }),

  /** GET /recently-deleted: everything the caller could see, newest first (D54). */
  recentlyDeleted: (limit: number) => http().get<{ items: DeletedItem[] }>('/recently-deleted', { query: { limit } }),

  /** GET /me/reminders: the caller's reminders from today on, open tasks only, soonest first (D11), for the device to schedule. */
  myReminders: (limit: number, cursor?: string) => http().get<{ items: MyReminder[]; nextCursor: string | null }>('/me/reminders', { query: { limit, cursor } }),

  /** PUT /tasks/{id}/reminder: sets the caller's reminder. */
  setReminder: (taskId: Id, date: LocalDate, time: LocalTime) => http().put(`/tasks/${taskId}/reminder`, { body: { date, time } }),

  /** DELETE /tasks/{id}/reminder: removes the caller's reminder (204). */
  removeReminder: (taskId: Id) => http().delete(`/tasks/${taskId}/reminder`),

  /** PUT / DELETE /tasks/{id}/tags/{name} (204). */
  addTag: (taskId: Id, name: string) => http().put(`/tasks/${taskId}/tags/${encodeURIComponent(name)}`),
  removeTag: (taskId: Id, name: string) => http().delete(`/tasks/${taskId}/tags/${encodeURIComponent(name)}`),

  /** POST /tasks/{id}/steps: a step at the end (201). */
  addStep: (taskId: Id, title: string) => http().post<Step>(`/tasks/${taskId}/steps`, { body: { title } }),

  /** PATCH /steps/{id}: title or done. */
  updateStep: (stepId: Id, body: { title?: string; isDone?: boolean }) => http().patch<Step>(`/steps/${stepId}`, { body }),

  /** DELETE /steps/{id} (204). */
  removeStep: (stepId: Id) => http().delete(`/steps/${stepId}`),

  /**
   * POST /tasks/{id}:assign with If-Match: Pending, or Accepted when it's the caller (M43). An email reaches anyone, even
   * outside the list (its owner only, D70); without an account it's an invitation (`invitedEmail`).
   */
  assign: (task: Versioned, to: Id | { email: string }) =>
    http().post<Task>(`/tasks/${task.id}:assign`, { body: typeof to === 'string' ? { userId: to } : to, ifMatch: task.version }),

  /** POST /tasks/{id}:unassign with If-Match. Undefined (204) when the caller gave back a task they saw only as its assignee (D70). */
  unassign: (task: Versioned) => http().post<Task | undefined>(`/tasks/${task.id}:unassign`, { ifMatch: task.version }),

  /**
   * POST /tasks/{id}:accept-assignment or :reject-assignment (optional reason, up to 500), by the assignee while Pending.
   * Declining keeps them on it as Declined (D71); undefined (204) when they saw it only as its assignee (D70).
   */
  answerAssignment: (task: Versioned, accept: boolean, reason?: string) =>
    http().post<Task | undefined>(`/tasks/${task.id}:${accept ? 'accept' : 'reject'}-assignment`, { ifMatch: task.version, body: accept ? undefined : { reason: reason || undefined } }),

  /** GET /tasks/{id}/comments (D92): newest first; `cursor` for older ones. */
  comments: (taskId: Id, limit: number, cursor?: string) => http().get<CommentsPage>(`/tasks/${taskId}/comments`, { query: { limit, cursor } }),

  /** A team's invite link (D95): see it, make a new one (the old stops), turn it off. Owner and admins. */
  inviteLink: (teamId: Id) => http().get<{ link: InviteLink | null }>(`/teams/${teamId}/invite-link`),
  newInviteLink: (teamId: Id) => http().post<{ link: InviteLink | null }>(`/teams/${teamId}/invite-link`),
  turnOffInviteLink: (teamId: Id) => http().delete(`/teams/${teamId}/invite-link`),

  /** What a team's invite link or an invitation email's link opens (D95); anyone with the code, signed in or not. */
  previewLink: (kind: 'team' | 'invitation', code: string) =>
    http().get<LinkPreview>(kind === 'team' ? `/invite-links/${encodeURIComponent(code)}` : `/invitations/${encodeURIComponent(code)}`),

  /** Join with a team's invite link, or accept an email's invitation by its code (from any account, D95). */
  joinByLink: (kind: 'team' | 'invitation', code: string) =>
    http().post(kind === 'team' ? `/invite-links/${encodeURIComponent(code)}:accept` : `/invitations/${encodeURIComponent(code)}:accept`),

  /** GET /tasks/{id}/history (D94): newest first; `cursor` for older changes. */
  history: (taskId: Id, limit: number, cursor?: string) => http().get<HistoryPage>(`/tasks/${taskId}/history`, { query: { limit, cursor } }),

  /** POST /tasks/{id}/comments: `@{userId}` in the body mentions someone who sees the task. */
  addComment: (taskId: Id, body: string) => http().post<Comment>(`/tasks/${taskId}/comments`, { body: { body } }),

  /** PATCH /comments/{id}: its author's new text (marked edited). */
  editComment: (id: Id, body: string) => http().patch<Comment>(`/comments/${id}`, { body: { body } }),

  /** DELETE /comments/{id}: for good (its author, or whoever manages the list). */
  removeComment: (id: Id) => http().delete(`/comments/${id}`),

  /** POST /tasks/{id}:confirm: whoever assigned it saw that its assignee completed it (D71). */
  confirm: (task: Versioned) => http().post<Task>(`/tasks/${task.id}:confirm`, { ifMatch: task.version }),

  /** GET /home (D107): Home's numbers, its requests and the next reminder today, in one request. */
  home: () => http().get<Home>('/home'),

  /** GET /home/{section} (D67): one section, keyset-paged; `total` on the first page. */
  homeSection: (section: HomeSection, limit: number, cursor?: string) => http().get<TaskPage>(`/home/${section}`, { query: { limit, cursor } }),

  /** GET /invitations: invitations waiting for the caller, with who invited them and what joining shows. */
  invitations: () => getAll<MyInvitation>('/invitations'),

  /** POST /invitations/{id}:accept or :decline (D68), by the invited email (204). */
  answerInvitation: (id: Id, join: boolean) => http().post(`/invitations/${id}:${join ? 'accept' : 'decline'}`),
};
