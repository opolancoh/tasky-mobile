import type { Id, LocalDate, LocalTime } from '@/core/types';

import { http } from '../http';
import type { Collection, CreateTaskRequest, DeletedItem, Home, HomeSection, MyInvitation, Step, Tag, Task, TaskFilter, TaskPage, UpdateTaskRequest } from './types';

/** What a write needs from a task: its id and the version last read (If-Match). */
type Versioned = { id: Id; version: number };

export const tasksApi = {
  /** GET /collections: every collection the caller can see, Inbox first, with open counts. */
  collections: () => http().get<Collection[]>('/collections'),

  /** GET /tags: the caller's tags, with their color and open counts (D60). */
  tags: () => http().get<Tag[]>('/tags'),

  /** PUT /tags/{name}: one of the caller's own tags, or its color for them. */
  saveTag: (name: string, color: string | null) => http().put(`/tags/${encodeURIComponent(name)}`, { body: { color } }),

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

  /** GET /recently-deleted: everything the caller could see, newest first (D54). */
  recentlyDeleted: (limit: number) => http().get<{ items: DeletedItem[] }>('/recently-deleted', { query: { limit } }),

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

  /** POST /tasks/{id}:accept-assignment or :reject-assignment (optional reason, up to 500), by the assignee while Pending. */
  answerAssignment: (task: Versioned, accept: boolean, reason?: string) =>
    http().post<Task>(`/tasks/${task.id}:${accept ? 'accept' : 'reject'}-assignment`, { ifMatch: task.version, body: accept ? undefined : { reason: reason || undefined } }),

  /** GET /home (D67): every Home section's first `limit` items and totals, in one request. */
  home: (limit: number) => http().get<Home>('/home', { query: { limit } }),

  /** GET /home/{section} (D67): one section, keyset-paged; `total` on the first page. */
  homeSection: (section: HomeSection, limit: number, cursor?: string) => http().get<TaskPage>(`/home/${section}`, { query: { limit, cursor } }),

  /** GET /invitations: invitations waiting for the caller, with who invited them and what joining shows. */
  invitations: () => http().get<MyInvitation[]>('/invitations'),

  /** POST /invitations/{id}:accept or :decline (D68), by the invited email (204). */
  answerInvitation: (id: Id, join: boolean) => http().post(`/invitations/${id}:${join ? 'accept' : 'decline'}`),
};
