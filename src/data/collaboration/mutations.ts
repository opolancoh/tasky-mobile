import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/core/types';

import { collaborationApi } from './api';
import { collaborationKeys, pushKeys } from './keys';
import type { NotificationSettings } from './types';

/** Marks notifications read (opening one, or Mark all read); the lists and the count refetch. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: Id[] | 'all') => collaborationApi.markRead(ids),
    onSettled: () => queryClient.invalidateQueries({ queryKey: collaborationKeys.all }),
  });
}

/** A switch or quiet hours (D97): applied at once, rolled back if the PATCH fails. */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: Partial<NotificationSettings>) => collaborationApi.updateNotificationSettings(change),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: pushKeys.settings });
      const before = queryClient.getQueryData<NotificationSettings>(pushKeys.settings);
      if (before) queryClient.setQueryData(pushKeys.settings, { ...before, ...change });
      return { before };
    },
    onError: (_e, _change, context) => context?.before && queryClient.setQueryData(pushKeys.settings, context.before),
    onSuccess: (settings) => queryClient.setQueryData(pushKeys.settings, settings),
  });
}
