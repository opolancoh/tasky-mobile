import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { Id } from '@/core/types';

import type { HomeSection, MembersOf, TaskFilter } from './types';

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

/** Rows each Today section shows (M32); its See all pages by `HOME_PAGE`. Named after the API's GET /home. */
export const HOME_PREVIEW = 5;
export const HOME_PAGE = 20;

/** The Today tab in one request (GET /home, D67, M33). */
export const useHome = () => useQuery({ queryKey: taskKeys.home, queryFn: () => tasksApi.home(HOME_PREVIEW) });

/**
 * One Today section (GET /home/{section}), a page at a time (See all, M33): the next page loads as the list nears its end. `enabled: false`
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

/** Archived collections the caller can see (Browse › Archived). */
export const useArchivedCollections = () => useQuery({ queryKey: taskKeys.archived, queryFn: tasksApi.archivedCollections });

/** The caller's teams and their role (GET /teams). */
export const useTeams = () => useQuery({ queryKey: taskKeys.teams, queryFn: tasksApi.teams });

/** A team's or a collection's people. */
export const useMembers = (of: MembersOf, enabled = true) => useQuery({ queryKey: taskKeys.members(of.kind, of.id), queryFn: () => tasksApi.members(of), enabled });

/** Open invitations to a team or collection; only for those who invite (`enabled`). */
export const useOpenInvitations = (of: MembersOf, enabled: boolean) =>
  useQuery({ queryKey: taskKeys.openInvitations(of.kind, of.id), queryFn: () => tasksApi.openInvitations(of), enabled });

/** A task list a page at a time (GET /tasks, keyset): `total` on the first page; the next loads as the list nears its end. */
export const useTaskPages = (filter: TaskFilter, enabled = true) =>
  useInfiniteQuery({
    queryKey: [...taskKeys.list(filter), 'pages'],
    queryFn: ({ pageParam }) => tasksApi.list(filter, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled,
  });

/** Recently Deleted (D54): the first 50, newest first. */
export const useRecentlyDeleted = () => useQuery({ queryKey: taskKeys.deleted, queryFn: () => tasksApi.recentlyDeleted(50) });
