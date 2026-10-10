import type { Id, LocalDate, LocalTime } from '@/core/types';

import { http } from '../http';
import type {
  Collection, CreateCollectionRequest, CreateTaskRequest, DeletedItem, Home, HomeSection, Member, MembersOf, MyInvitation, MyReminder, OpenInvitation, Step, Tag, TagChange, Task, TaskFilter, TaskPage, TaskSummary, Team,
  UpdateCollectionRequest, UpdateTaskRequest,
} from './types';

/** What a write needs from a task: its id and the version last read (If-Match). */
type Versioned = { id: Id; version: number };

export const tasksApi = {
  /** GET /collections: every collection the caller can see, Inbox first, with open counts. */
  collections: () => http().get<Collection[]>('/collections'),

  /** GET /collections?archived=true: archived ones the caller can see. */
  archivedCollections: () => http().get<Collection[]>('/collections', { query: { archived: true } }),

  /** POST /collections (201). */
  createCollection: (body: CreateCollectionRequest) => http().post<Collection>('/collections', { body }),

  /** PATCH /collections/{id} with If-Match: name, color, sort (any member). */
  updateCollection: (c: Versioned, body: UpdateCollectionRequest) => http().patch<Collection>(`/collections/${c.id}`, { body, ifMatch: c.version }),

  /** POST /collections/{id}:archive or :unarchive with If-Match (managers). */
  archiveCollection: (c: Versioned, archive: boolean) => http().post<Collection>(`/collections/${c.id}:${archive ? 'archive' : 'unarchive'}`, { ifMatch: c.version }),

  /** DELETE /collections/{id} with If-Match: with its tasks, to Recently Deleted (managers). */
  deleteCollection: (c: Versioned) => http().delete(`/collections/${c.id}`, { ifMatch: c.version }),

  /** POST /collections/{id}:restore with the deleted collection's version. */
  restoreCollection: (item: Versioned) => http().post(`/collections/${item.id}:restore`, { ifMatch: item.version }),

  /** POST /collections:reorder: the caller's own Browse order (204). */
  reorderCollections: (ids: Id[]) => http().post('/collections:reorder', { body: { ids } }),

  /** GET /teams: the caller's teams, with their role. */
  teams: () => http().get<Team[]>('/teams'),

  /** POST /teams: the caller is its owner (201). */
  createTeam: (name: string) => http().post<Team>('/teams', { body: { name } }),

  /** PATCH /teams/{id} with If-Match: rename (owner). */
  renameTeam: (team: Versioned, name: string) => http().patch<Team>(`/teams/${team.id}`, { body: { name }, ifMatch: team.version }),

  /** DELETE /teams/{id} with If-Match: with its collections (owner). */
  deleteTeam: (team: Versioned) => http().delete(`/teams/${team.id}`, { ifMatch: team.version }),

  /** POST /teams/{id}:restore with the deleted team's version. */
  restoreTeam: (item: Versioned) => http().post(`/teams/${item.id}:restore`, { ifMatch: item.version }),

  /** GET /teams/{id}/members or /collections/{id}/members. */
  members: (of: MembersOf) => http().get<Member[]>(`/${of.kind}s/${of.id}/members`),

  /** DELETE …/members/{userId}: remove someone; on yourself, leave (204). */
  removeMember: (of: MembersOf, userId: Id) => http().delete(`/${of.kind}s/${of.id}/members/${userId}`),

  /** GET …/invitations: open invitations (those who invite). */
  openInvitations: (of: MembersOf) => http().get<OpenInvitation[]>(`/${of.kind}s/${of.id}/invitations`),

  /** POST …/invitations { email } (201). Inviting the same email again replaces the open invitation. */
  invite: (of: MembersOf, email: string) => http().post<OpenInvitation>(`/${of.kind}s/${of.id}/invitations`, { body: { email } }),

  /** DELETE /invitations/{id}: revoke (204). */
  revokeInvitation: (id: Id) => http().delete(`/invitations/${id}`),

  /** GET /tags: the caller's tags, with their color and open counts (D60). */
  tags: () => http().get<Tag[]>('/tags'),

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

  /** POST /tasks: a new task at the bottom of `collectionId`, or of the caller's Inbox (201). */
  createTask: (body: CreateTaskRequest) => http().post<Task>('/tasks', { body }),

  /** GET /tasks/{id}: the full task (D55). */
  get: (taskId: Id) => http().get<Task>(`/tasks/${taskId}`),

  /** GET /tasks (D51, D61): everything the caller can see, narrowed by the filter; keyset-paged, `total` on the first page. */
  list: ({ due, ...filter }: TaskFilter, cursor?: string) => http().get<TaskPage>('/tasks', { query: { ...filter, due: due?.join(','), cursor } }),

  /** PATCH /tasks/{id} with If-Match. */
  update: (task: Versioned, body: UpdateTaskRequest) => http().patch<Task>(`/tasks/${task.id}`, { body, ifMatch: task.version }),

  /** POST /tasks/{id}:complete with If-Match. A repeating task stays open on its next due date. */
  complete: (task: Versioned) => http().post<Task>(`/tasks/${task.id}:complete`, { ifMatch: task.version }),

  /** POST /tasks/{id}:reopen with If-Match. */
  reopen: (task: Versioned) => http().post<Task>(`/tasks/${task.id}:reopen`, { ifMatch: task.version }),

  /** POST /tasks/{id}:skip: a repeating task moves to its next date without a completion. */
  skip: (task: Versioned) => http().post<Task>(`/tasks/${task.id}:skip`, { ifMatch: task.version }),

  /** POST /tasks/{id}:move to the bottom of another collection the caller can see. */
  move: (task: Versioned, collectionId: Id) => http().post<Task>(`/tasks/${task.id}:move`, { body: { collectionId }, ifMatch: task.version }),

  /** DELETE /tasks/{id}: to Recently Deleted for 30 days (204). */
  remove: (task: Versioned) => http().delete(`/tasks/${task.id}`, { ifMatch: task.version }),

  /** POST /tasks/{id}:restore with the deleted task's version. */
  restore: (item: Versioned) => http().post<Task>(`/tasks/${item.id}:restore`, { ifMatch: item.version }),

  /** GET /search?q= (D32, D61): tasks, open and completed, in everything the caller can see; best match first, keyset-paged. */
  search: (q: string, limit: number, cursor?: string) => http().get<{ items: TaskSummary[]; nextCursor: string | null }>('/search', { query: { q, limit, cursor } }),

  /** GET /recently-deleted: everything the caller could see, newest first (D54). */
  recentlyDeleted: (limit: number) => http().get<{ items: DeletedItem[] }>('/recently-deleted', { query: { limit } }),

  /** GET /me/reminders: the caller's reminders from today on, open tasks only, soonest first (D11), for the device to schedule. */
  myReminders: (limit: number) => http().get<{ items: MyReminder[]; nextCursor: string | null }>('/me/reminders', { query: { limit } }),

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

  /** POST /tasks/{id}:confirm: whoever assigned it saw that its assignee completed it (D71). */
  confirm: (task: Versioned) => http().post<Task>(`/tasks/${task.id}:confirm`, { ifMatch: task.version }),

  /** GET /home (D67): every Today section's first `limit` items and totals, in one request. */
  home: (limit: number) => http().get<Home>('/home', { query: { limit } }),

  /** GET /home/{section} (D67): one section, keyset-paged; `total` on the first page. */
  homeSection: (section: HomeSection, limit: number, cursor?: string) => http().get<TaskPage>(`/home/${section}`, { query: { limit, cursor } }),

  /** GET /invitations: invitations waiting for the caller, with who invited them and what joining shows. */
  invitations: () => http().get<MyInvitation[]>('/invitations'),

  /** POST /invitations/{id}:accept or :decline (D68), by the invited email (204). */
  answerInvitation: (id: Id, join: boolean) => http().post(`/invitations/${id}:${join ? 'accept' : 'decline'}`),
};
