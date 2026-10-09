import { useQuery } from '@tanstack/react-query';

import type { Id } from '@/core/types';

import type { TaskFilter } from './types';

import { tasksApi } from './api';
import { taskKeys } from './keys';

/** Every collection the caller can see, Inbox first. */
export const useCollections = () => useQuery({ queryKey: taskKeys.collections, queryFn: tasksApi.collections });

/** The caller's tags (D60). */
export const useTags = () => useQuery({ queryKey: taskKeys.tags, queryFn: tasksApi.tags });

/**
 * The first page of a task list (D51, D61) over everything the caller can see, e.g.
 * `{ important: true, mine: true, due: ['upcoming', 'none'], limit: 3 }`; add `collectionId` for one collection.
 * `enabled: false` waits (e.g. for today's date).
 */
export const useTaskList = (filter: TaskFilter, enabled = true) =>
  useQuery({ queryKey: taskKeys.list(filter), queryFn: () => tasksApi.list(filter), enabled });

/** The full task (D55). */
export const useTask = (taskId: Id) => useQuery({ queryKey: taskKeys.detail(taskId), queryFn: () => tasksApi.get(taskId) });
