import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { Id } from '@/core/types';

import type { HomeSection, MembersOf, TaskFilter } from './types';

import { tasksApi } from './api';
import { taskKeys } from './keys';

/** Every task list the caller can see, Inbox first. */
export const useTaskLists = () => useQuery({ queryKey: taskKeys.taskLists, queryFn: tasksApi.taskLists });

/**
 * Whom the caller can pick without an email (D89): kept a few minutes, and the last answer stays while the next loads. A
 * query the user has typed past is cancelled (the request's `signal`).
 */
export const PEOPLE_LIMIT = 8;
export const usePeople = (q: string) =>
  useQuery({ queryKey: taskKeys.people(q), queryFn: ({ signal }) => tasksApi.people(q, q ? 20 : PEOPLE_LIMIT, signal), staleTime: 5 * 60_000, placeholderData: keepPreviousData });

/** The caller's tags (D60). */
export const useTags = () => useQuery({ queryKey: taskKeys.tags, queryFn: tasksApi.tags });

/**
 * The first page of a task list (D51, D61) over everything the caller can see, e.g.
 * `{ important: true, mine: true, due: ['upcoming', 'none'], limit: 3 }`; add `taskListId` for one task list.
 * `enabled: false` waits (e.g. for today's date).
 */
export const useTasks = (filter: TaskFilter, enabled = true) =>
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

/** Archived task lists the caller can see (Browse › Archived). */
export const useArchivedTaskLists = () => useQuery({ queryKey: taskKeys.archived, queryFn: tasksApi.archivedTaskLists });

/** The caller's teams and their role (GET /teams). */
export const useTeams = () => useQuery({ queryKey: taskKeys.teams, queryFn: tasksApi.teams });

/** A team's or a task list's people. */
export const useMembers = (of: MembersOf, enabled = true) => useQuery({ queryKey: taskKeys.members(of.kind, of.id), queryFn: () => tasksApi.members(of), enabled });

/** Open invitations to a team or task list; only for those who invite (`enabled`). */
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

/** A task's comments (D92): the latest 20, then older ones on Show earlier (`fetchNextPage`); newest first in each page. */
export const useComments = (taskId: Id, enabled = true) =>
  useInfiniteQuery({
    queryKey: taskKeys.comments(taskId),
    queryFn: ({ pageParam }) => tasksApi.comments(taskId, 20, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled,
  });

/** How many a list inside Task detail shows before it moves to its own screen (M83): more would draw too much at once. */
export const INLINE_MAX = 60;

/**
 * A task's history (D94): nothing until `enabled` (Show history), then 20 at a time, newest first. Forgotten as soon
 * as nothing shows it (`gcTime` 0): most people never look, and a later look reads it fresh.
 */
export const useHistory = (taskId: Id, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: taskKeys.history(taskId),
    queryFn: ({ pageParam }) => tasksApi.history(taskId, 20, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled,
    gcTime: 0,
  });

/** Recently Deleted (D54): the first 50, newest first. */
export const useRecentlyDeleted = () => useQuery({ queryKey: taskKeys.deleted, queryFn: () => tasksApi.recentlyDeleted(50) });

/** Search (M40): a page of 20 at a time, best match first; `enabled` once there is a word to look for. The last results stay while the next query loads; one typed past is cancelled. */
export const useSearch = (q: string) =>
  useInfiniteQuery({
    queryKey: taskKeys.search(q),
    queryFn: ({ pageParam, signal }) => tasksApi.search(q, 20, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    enabled: /[\p{L}\p{N}]/u.test(q),
  });
