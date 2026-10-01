import type { Id } from '@/core/types';

/** Every key starts with the workspace, so switching workspaces never shows another's data (06-mobile.md, Data). */
export const taskKeys = {
  all: (workspaceId: Id) => ['workspace', workspaceId] as const,
  collections: (workspaceId: Id) => ['workspace', workspaceId, 'collections'] as const,
  tags: (workspaceId: Id) => ['workspace', workspaceId, 'tags'] as const,
  views: (workspaceId: Id) => ['workspace', workspaceId, 'views'] as const,
};
