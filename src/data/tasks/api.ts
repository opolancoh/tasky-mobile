import type { Id } from '@/core/types';

import { http } from '../http';
import type { Collection, CreateTaskRequest, Tag, Task, TaskFilter, TaskList, TaskPage, UpcomingView, UpdateTaskRequest } from './types';

export const tasksApi = {
  /** GET /collections?workspaceId=: Inbox first, with open counts. */
  collections: (workspaceId: Id) => http().get<Collection[]>('/collections', { query: { workspaceId } }),

  /** GET /tags?workspaceId=: with open counts. */
  tags: (workspaceId: Id) => http().get<Tag[]>('/tags', { query: { workspaceId } }),

  /** POST /tasks: a new task at the bottom of `collectionId`, or of `workspaceId`'s Inbox (201). */
  createTask: (body: CreateTaskRequest) => http().post<Task>('/tasks', { body }),

  /** DELETE /tasks/{id}/reminder: removes the caller's reminder (204). */
  removeReminder: (taskId: Id) => http().delete(`/tasks/${taskId}/reminder`),

  /** GET /tasks (D51, D52): the scope (workspaceId or collectionId) plus filters; keyset-paged, `total` on the first page. */
  list: ({ due, ...filter }: TaskFilter, cursor?: string) => http().get<TaskPage>('/tasks', { query: { ...filter, due: due?.join(','), cursor } }),

  /** GET /views/today: overdue first, then due today (the profile's today). */
  today: (workspaceId: Id) => http().get<TaskList>('/views/today', { query: { workspaceId } }),

  /** GET /views/upcoming: the next 7 days by day, then Later. */
  upcoming: (workspaceId: Id) => http().get<UpcomingView>('/views/upcoming', { query: { workspaceId } }),

  /** PATCH /tasks/{id} with If-Match. */
  update: (task: { id: Id; version: number }, body: UpdateTaskRequest) => http().patch<Task>(`/tasks/${task.id}`, { body, ifMatch: task.version }),

  /** POST /tasks/{id}:complete with If-Match. */
  complete: (task: { id: Id; version: number }) => http().post<Task>(`/tasks/${task.id}:complete`, { ifMatch: task.version }),

  /** POST /tasks/{id}:accept-assignment or :reject-assignment, by the assignee while Pending. */
  answerAssignment: (task: { id: Id; version: number }, accept: boolean) =>
    http().post<Task>(`/tasks/${task.id}:${accept ? 'accept' : 'reject'}-assignment`, { ifMatch: task.version, body: accept ? undefined : {} }),
};
