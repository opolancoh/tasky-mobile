import type { Id } from '@/core/types';

import { http } from '../http';
import type { Collection, CreateTaskRequest, Tag, Task } from './types';

export const tasksApi = {
  /** GET /workspaces/{id}/collections: Inbox first, with open counts. */
  collections: (workspaceId: Id) => http().get<Collection[]>(`/workspaces/${workspaceId}/collections`),

  /** GET /workspaces/{id}/tags: with open counts. */
  tags: (workspaceId: Id) => http().get<Tag[]>(`/workspaces/${workspaceId}/tags`),

  /** POST /collections/{id}/tasks: a new task at the bottom of the collection (201). */
  createTask: (collectionId: Id, body: CreateTaskRequest) => http().post<Task>(`/collections/${collectionId}/tasks`, { body }),

  /** DELETE /tasks/{id}/reminder: removes the caller's reminder (204). */
  removeReminder: (taskId: Id) => http().delete(`/tasks/${taskId}/reminder`),
};
