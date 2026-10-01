import { useQuery } from '@tanstack/react-query';

import type { Id } from '@/core/types';

import { tasksApi } from './api';
import { taskKeys } from './keys';

/** The workspace's collections, Inbox first. Waits until there is a workspace. */
export const useCollections = (workspaceId: Id | undefined) =>
  useQuery({ queryKey: taskKeys.collections(workspaceId ?? ''), queryFn: () => tasksApi.collections(workspaceId!), enabled: !!workspaceId });

/** The workspace's tags. */
export const useTags = (workspaceId: Id | undefined) =>
  useQuery({ queryKey: taskKeys.tags(workspaceId ?? ''), queryFn: () => tasksApi.tags(workspaceId!), enabled: !!workspaceId });
