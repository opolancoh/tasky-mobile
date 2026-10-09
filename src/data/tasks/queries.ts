import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { Id } from '@/core/types';

import type { HomeSection, TaskFilter } from './types';

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

/** Rows each Home section shows (M32); its See all pages by `HOME_PAGE`. */
export const HOME_PREVIEW = 5;
export const HOME_PAGE = 20;

/** Home in one request (D67, M33). */
export const useHome = () => useQuery({ queryKey: taskKeys.home, queryFn: () => tasksApi.home(HOME_PREVIEW) });

/**
 * One Home section, a page at a time (See all, M33): the next page loads as the list nears its end. `enabled: false`
 * waits (Needs attention pages its overdue tasks after the assignments to answer).
 */
export const useHomeSection = (section: HomeSection, enabled = true) =>
  useInfiniteQuery({
    queryKey: taskKeys.homeSection(section),
    queryFn: ({ pageParam }) => tasksApi.homeSection(section, HOME_PAGE, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled,
  });

/** Invitations waiting for the caller (the Invitation screen reads one from here). */
export const useInvitations = (enabled = true) => useQuery({ queryKey: taskKeys.invitations, queryFn: tasksApi.invitations, enabled });

/** The full task (D55). */
export const useTask = (taskId: Id) => useQuery({ queryKey: taskKeys.detail(taskId), queryFn: () => tasksApi.get(taskId) });
