import type { Id } from '@/core/types';

/**
 * No workspace in the keys (M31): every list covers everything the caller can see. Signing out clears the cache, so
 * another user never sees these.
 */
export const taskKeys = {
  all: ['tasks'] as const,
  taskLists: ['tasks', 'taskLists'] as const,
  tags: ['tasks', 'tags'] as const,
  archived: ['tasks', 'taskLists', 'archived'] as const,
  teams: ['tasks', 'teams'] as const,
  /** A team's or a task list's people and open invitations. */
  members: (kind: string, id: Id) => ['tasks', 'members', kind, id] as const,
  openInvitations: (kind: string, id: Id) => ['tasks', 'members', kind, id, 'invitations'] as const,
  /** People to pick (GET /people) for a query. */
  people: (q: string) => ['tasks', 'people', q] as const,
  /** Search results for a query: views too, so completing a task refetches them. */
  search: (q: string) => ['tasks', 'views', 'search', q] as const,
  /** Recently Deleted: changes with every delete and restore. */
  deleted: ['tasks', 'views', 'deleted'] as const,
  /** Every task list (views and filtered lists): invalidated together after any task change. */
  views: ['tasks', 'views'] as const,
  list: (filter: object) => ['tasks', 'views', filter] as const,
  /** The Today tab (GET /home) and its sections (See all): views too, so any task change refetches them. */
  home: ['tasks', 'views', 'home'] as const,
  homeSection: (section: string) => ['tasks', 'views', 'home', section] as const,
  /** Invitations waiting for the caller (also inside Today). */
  invitations: ['tasks', 'views', 'invitations'] as const,
  /** Toggles on a task (mutation keys, M75): rows read which tasks are still saving. */
  completing: ['tasks', 'complete'] as const,
  reopening: ['tasks', 'reopen'] as const,
  confirming: ['tasks', 'confirm'] as const,
  /** One task (GET /tasks/{id}). Not under `views`: lists refetch on their own after a change. */
  detail: (taskId: Id) => ['tasks', 'task', taskId] as const,
  /** A task's comments (D92), newest first in pages. */
  comments: (taskId: Id) => ['tasks', 'task', taskId, 'comments'] as const,
  /** A task's history (D94), loaded only when asked for. */
  history: (taskId: Id) => ['tasks', 'task', taskId, 'history'] as const,
};
