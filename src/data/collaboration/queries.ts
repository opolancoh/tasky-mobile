import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { collaborationApi } from './api';
import { collaborationKeys } from './keys';

/** Home's Updates (M32): the newest unread notifications. */
export const useUnreadNotifications = (limit: number) =>
  useQuery({ queryKey: collaborationKeys.unread, queryFn: () => collaborationApi.notifications(limit, true) });

/** How many are unread (Updates' count). */
export const useUnreadCount = () => useQuery({ queryKey: collaborationKeys.unreadCount, queryFn: collaborationApi.unreadCount });

/** Every notification, a page at a time (Updates' See all, M33). */
export const useNotifications = (pageSize: number, enabled = true) =>
  useInfiniteQuery({
    queryKey: collaborationKeys.list,
    queryFn: ({ pageParam }) => collaborationApi.notifications(pageSize, false, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled,
  });
