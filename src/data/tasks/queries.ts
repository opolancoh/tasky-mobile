import { useQuery } from '@tanstack/react-query';

import type { Id } from '@/core/types';

import type { TaskFilter } from './types';

import { tasksApi } from './api';
import { taskKeys } from './keys';

/** The workspace's collections, Inbox first. Waits until there is a workspace. */
export const useCollections = (workspaceId: Id | undefined) =>
  useQuery({ queryKey: taskKeys.collections(workspaceId ?? ''), queryFn: () => tasksApi.collections(workspaceId!), enabled: !!workspaceId });

/** The workspace's tags. */
export const useTags = (workspaceId: Id | undefined) =>
  useQuery({ queryKey: taskKeys.tags(workspaceId ?? ''), queryFn: () => tasksApi.tags(workspaceId!), enabled: !!workspaceId });

/**
 * The first page of a task list (D51, D52) in a workspace, e.g. `{ important: true, due: ['upcoming', 'none'], limit: 3 }`;
 * add `collectionId` for one collection. Waits until there is a workspace.
 */
export const useTaskList = (workspaceId: Id | undefined, filter: Omit<TaskFilter, 'workspaceId'>) =>
  useQuery({
    queryKey: taskKeys.list(workspaceId ?? '', filter),
    queryFn: () => tasksApi.list(filter.collectionId ? filter : { ...filter, workspaceId }),
    enabled: !!workspaceId,
  });
