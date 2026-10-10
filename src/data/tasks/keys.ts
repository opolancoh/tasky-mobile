import type { Id } from '@/core/types';

/**
 * No workspace in the keys (M31): every list covers everything the caller can see. Signing out clears the cache, so
 * another user never sees these.
 */
export const taskKeys = {
  all: ['tasks'] as const,
  collections: ['tasks', 'collections'] as const,
  tags: ['tasks', 'tags'] as const,
  archived: ['tasks', 'collections', 'archived'] as const,
  teams: ['tasks', 'teams'] as const,
  /** A team's or a collection's people and open invitations. */
  members: (kind: string, id: Id) => ['tasks', 'members', kind, id] as const,
  openInvitations: (kind: string, id: Id) => ['tasks', 'members', kind, id, 'invitations'] as const,
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
  /** One task (GET /tasks/{id}). Not under `views`: lists refetch on their own after a change. */
  detail: (taskId: Id) => ['tasks', 'task', taskId] as const,
};
