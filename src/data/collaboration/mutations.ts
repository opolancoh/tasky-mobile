import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/core/types';

import { collaborationApi } from './api';
import { collaborationKeys } from './keys';

/** Marks notifications read (opening one, or Mark all read); the lists and the count refetch. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: Id[] | 'all') => collaborationApi.markRead(ids),
    onSettled: () => queryClient.invalidateQueries({ queryKey: collaborationKeys.all }),
  });
}
