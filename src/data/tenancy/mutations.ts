import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '../tasks/keys';
import { tenancyApi } from './api';
import { tenancyKeys } from './keys';
import type { UpdateMeRequest } from './types';

/**
 * PATCH /me (Settings, M41): the answer replaces the cached profile. A new time zone moves "today", so every task list
 * refetches.
 */
export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeRequest) => tenancyApi.updateMe(body),
    onSuccess: (me, body) => {
      queryClient.setQueryData(tenancyKeys.me, me);
      if (body.timeZone) queryClient.invalidateQueries({ queryKey: taskKeys.views });
    },
  });
}
