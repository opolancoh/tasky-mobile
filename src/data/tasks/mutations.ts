import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/core/types';

import { tasksApi } from './api';
import { taskKeys } from './keys';
import type { CreateTaskRequest } from './types';

/**
 * Creates a task. Not optimistic (06-mobile.md, Data): the sheet waits for the answer. Afterwards the
 * views, the collections' counts and the tags (a #tag may have created one) are refetched.
 */
export function useCreateTask(workspaceId: Id | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, body }: { collectionId: Id; body: CreateTaskRequest }) => tasksApi.createTask(collectionId, body),
    onSuccess: () => {
      if (!workspaceId) return;
      queryClient.invalidateQueries({ queryKey: taskKeys.views(workspaceId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.collections(workspaceId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.tags(workspaceId) });
    },
  });
}
