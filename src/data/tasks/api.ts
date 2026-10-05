import type { Id, LocalDate, LocalTime } from '@/core/types';

import { http } from '../http';
import type { Collection, CreateTaskRequest, DeletedItem, Step, Tag, Task, TaskFilter, TaskPage, UpdateTaskRequest } from './types';

/** What a write needs from a task: its id and the version last read (If-Match). */
type Versioned = { id: Id; version: number };

export const tasksApi = {
  /** GET /collections?workspaceId=: Inbox first, with open counts. */
  collections: (workspaceId: Id) => http().get<Collection[]>('/collections', { query: { workspaceId } }),

  /** GET /tags?workspaceId=: with open counts. */
  tags: (workspaceId: Id) => http().get<Tag[]>('/tags', { query: { workspaceId } }),

  /** POST /tags: a new tag in the workspace (201). */
  createTag: (workspaceId: Id, name: string) => http().post<Tag>('/tags', { body: { workspaceId, name } }),

  /** POST /tasks: a new task at the bottom of `collectionId`, or of `workspaceId`'s Inbox (201). */
  createTask: (body: CreateTaskRequest) => http().post<Task>('/tasks', { body }),

  /** GET /tasks/{id}: the full task (D55). */
  get: (taskId: Id) => http().get<Task>(`/tasks/${taskId}`),

  /** GET /tasks (D51, D52): the scope (workspaceId or collectionId) plus filters; keyset-paged, `total` on the first page. */
  list: ({ due, ...filter }: TaskFilter, cursor?: string) => http().get<TaskPage>('/tasks', { query: { ...filter, due: due?.join(','), cursor } }),

  /** PATCH /tasks/{id} with If-Match. */
  update: (task: Versioned, body: UpdateTaskRequest) => http().patch<Task>(`/tasks/${task.id}`, { body, ifMatch: task.version }),

  /** POST /tasks/{id}:complete with If-Match. A repeating task stays open on its next due date. */
  complete: (task: Versioned) => http().post<Task>(`/tasks/${task.id}:complete`, { ifMatch: task.version }),

  /** POST /tasks/{id}:reopen with If-Match. */
  reopen: (task: Versioned) => http().post<Task>(`/tasks/${task.id}:reopen`, { ifMatch: task.version }),

  /** POST /tasks/{id}:skip: a repeating task moves to its next date without a completion. */
  skip: (task: Versioned) => http().post<Task>(`/tasks/${task.id}:skip`, { ifMatch: task.version }),

  /** POST /tasks/{id}:move to the bottom of another collection. */
  move: (task: Versioned, collectionId: Id) => http().post<{ task: Task; droppedTags: string[] }>(`/tasks/${task.id}:move`, { body: { collectionId }, ifMatch: task.version }),

  /** DELETE /tasks/{id}: to Recently Deleted for 30 days (204). */
  remove: (task: Versioned) => http().delete(`/tasks/${task.id}`, { ifMatch: task.version }),

  /** POST /tasks/{id}:restore with the deleted task's version. */
  restore: (item: Versioned) => http().post<Task>(`/tasks/${item.id}:restore`, { ifMatch: item.version }),

  /** GET /recently-deleted?workspaceId=: newest first (D54). */
  recentlyDeleted: (workspaceId: Id, limit: number) => http().get<{ items: DeletedItem[] }>('/recently-deleted', { query: { workspaceId, limit } }),

  /** PUT /tasks/{id}/reminder: sets the caller's reminder. */
  setReminder: (taskId: Id, date: LocalDate, time: LocalTime) => http().put(`/tasks/${taskId}/reminder`, { body: { date, time } }),

  /** DELETE /tasks/{id}/reminder: removes the caller's reminder (204). */
  removeReminder: (taskId: Id) => http().delete(`/tasks/${taskId}/reminder`),

  /** PUT / DELETE /tasks/{id}/tags/{tagId} (204). */
  addTag: (taskId: Id, tagId: Id) => http().put(`/tasks/${taskId}/tags/${tagId}`),
  removeTag: (taskId: Id, tagId: Id) => http().delete(`/tasks/${taskId}/tags/${tagId}`),

  /** POST /tasks/{id}/steps: a step at the end (201). */
  addStep: (taskId: Id, title: string) => http().post<Step>(`/tasks/${taskId}/steps`, { body: { title } }),

  /** PATCH /steps/{id}: title or done. */
  updateStep: (stepId: Id, body: { title?: string; isDone?: boolean }) => http().patch<Step>(`/steps/${stepId}`, { body }),

  /** DELETE /steps/{id} (204). */
  removeStep: (stepId: Id) => http().delete(`/steps/${stepId}`),

  /** POST /tasks/{id}:accept-assignment or :reject-assignment, by the assignee while Pending. */
  answerAssignment: (task: Versioned, accept: boolean) =>
    http().post<Task>(`/tasks/${task.id}:${accept ? 'accept' : 'reject'}-assignment`, { ifMatch: task.version, body: accept ? undefined : {} }),
};
