import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/core/types';

import { tasksApi } from './api';
import { taskKeys } from './keys';
import type { CreateTaskRequest, TaskSummary, UpdateTaskRequest } from './types';

/**
 * Creates a task. Not optimistic (06-mobile.md, Data): the sheet waits for the answer. Afterwards the
 * views, the collections' counts and the tags (a #tag may have created one) are refetched.
 * `withoutReminder`: a task created with a due date gets the caller's 9:00 reminder (D31); this
 * removes it right away, for someone who set a due date without a reminder (M19).
 */
export function useCreateTask(workspaceId: Id | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionId, body, withoutReminder }: { collectionId: Id; body: CreateTaskRequest; withoutReminder?: boolean }) => {
      const task = await tasksApi.createTask(collectionId, body);
      // The task exists either way; if this fails, it keeps the 9:00 reminder, which can be removed later.
      if (withoutReminder) await tasksApi.removeReminder(task.id).catch(() => undefined);
      return task;
    },
    onSuccess: () => {
      if (!workspaceId) return;
      queryClient.invalidateQueries({ queryKey: taskKeys.views(workspaceId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.collections(workspaceId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.tags(workspaceId) });
    },
  });
}

/** After any change to a task: every list and the collections' counts are refetched. */
function useRefetchTasks(workspaceId: Id | undefined) {
  const queryClient = useQueryClient();
  return () => {
    if (!workspaceId) return;
    queryClient.invalidateQueries({ queryKey: taskKeys.views(workspaceId) });
    queryClient.invalidateQueries({ queryKey: taskKeys.collections(workspaceId) });
  };
}

/** POST /tasks/{id}:complete. */
export function useCompleteTask(workspaceId: Id | undefined) {
  const refetch = useRefetchTasks(workspaceId);
  return useMutation({ mutationFn: (task: TaskSummary) => tasksApi.complete(task), onSettled: refetch });
}

/** PATCH /tasks/{id}, e.g. `{ dueDate: today }` to move a task to today. */
export function useUpdateTask(workspaceId: Id | undefined) {
  const refetch = useRefetchTasks(workspaceId);
  return useMutation({ mutationFn: ({ task, body }: { task: TaskSummary; body: UpdateTaskRequest }) => tasksApi.update(task, body), onSettled: refetch });
}

/** Accept or reject a task assigned to the caller (while Pending). */
export function useAnswerAssignment(workspaceId: Id | undefined) {
  const refetch = useRefetchTasks(workspaceId);
  return useMutation({ mutationFn: ({ task, accept }: { task: TaskSummary; accept: boolean }) => tasksApi.answerAssignment(task, accept), onSettled: refetch });
}
