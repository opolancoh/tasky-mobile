import type { Id } from '@/core/types';

/** Every key starts with the workspace, so switching workspaces never shows another's data (06-mobile.md, Data). */
export const taskKeys = {
  all: (workspaceId: Id) => ['workspace', workspaceId] as const,
  collections: (workspaceId: Id) => ['workspace', workspaceId, 'collections'] as const,
  tags: (workspaceId: Id) => ['workspace', workspaceId, 'tags'] as const,
  /** Every task list (views and filtered lists): invalidated together after any task change. */
  views: (workspaceId: Id) => ['workspace', workspaceId, 'views'] as const,
  list: (workspaceId: Id, filter: object) => ['workspace', workspaceId, 'views', 'tasks', filter] as const,
  /** One task (GET /tasks/{id}). Not under `views`: lists refetch on their own after a change. */
  detail: (workspaceId: Id, taskId: Id) => ['workspace', workspaceId, 'task', taskId] as const,
};
