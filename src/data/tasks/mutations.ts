import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/core/http/problem';
import type { Id } from '@/core/types';

import { tasksApi } from './api';
import { taskKeys } from './keys';
import type { CreateTaskRequest, Task, TaskSummary, UpdateTaskRequest } from './types';

/**
 * Creates a task. Not optimistic (06-mobile.md, Data): the sheet waits for the answer. Afterwards the
 * views, the collections' counts (the Inbox may be new, D59) and the tags (a new name joins them) are refetched.
 * `withoutReminder`: a task created with a due date gets the caller's 9:00 reminder (D31); this
 * removes it right away, for someone who set a due date without a reminder (M19).
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, withoutReminder }: { body: CreateTaskRequest; withoutReminder?: boolean }) => {
      const task = await tasksApi.createTask(body);
      // The task exists either way; if this fails, it keeps the 9:00 reminder, which can be removed later.
      if (withoutReminder) await tasksApi.removeReminder(task.id).catch(() => undefined);
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.views });
      queryClient.invalidateQueries({ queryKey: taskKeys.collections });
      queryClient.invalidateQueries({ queryKey: taskKeys.tags });
    },
  });
}

/** After any change to a task: every list and the collections' counts are refetched. */
function useRefetchTasks() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.views });
    queryClient.invalidateQueries({ queryKey: taskKeys.collections });
  };
}

/** POST /tasks/{id}:complete. */
export function useCompleteTask() {
  const refetch = useRefetchTasks();
  return useMutation({ mutationFn: (task: TaskSummary) => tasksApi.complete(task), onSettled: refetch });
}

/** PATCH /tasks/{id}, e.g. `{ dueDate: today }` to move a task to today. */
export function useUpdateTask() {
  const refetch = useRefetchTasks();
  return useMutation({ mutationFn: ({ task, body }: { task: TaskSummary; body: UpdateTaskRequest }) => tasksApi.update(task, body), onSettled: refetch });
}

/** Accept or reject a task assigned to the caller (while Pending). */
export function useAnswerAssignment() {
  const refetch = useRefetchTasks();
  return useMutation({ mutationFn: ({ task, accept }: { task: TaskSummary; accept: boolean }) => tasksApi.answerAssignment(task, accept), onSettled: refetch });
}

/**
 * Join or decline an invitation (D68). Joining adds collections (and maybe a team), so every list and the collections
 * refetch; declining only drops it from Home and the invitations.
 */
export function useAnswerInvitation() {
  const refetch = useRefetchTasks();
  return useMutation({ mutationFn: ({ id, join }: { id: Id; join: boolean }) => tasksApi.answerInvitation(id, join), onSettled: refetch });
}

/** A command on one task (complete, reopen, skip), for `useChangeTask`. */
export interface TaskChange {
  /** Calls the API with the task as last read (its version is the If-Match). */
  run(task: Task): Promise<Task>;
  /** The task as it should look right away; rolled back if the command fails (06-mobile.md, Data). */
  optimistic?(task: Task): Task;
}

/**
 * Runs a command on one task (Task detail's circle and Skip), one at a time (`scope`), against the latest version.
 * A 412 rereads the task and runs it once more. Afterwards every list and the collections' counts refetch.
 */
export function useChangeTask(taskId: Id) {
  const queryClient = useQueryClient();
  const refetchLists = useRefetchTasks();
  const key = taskKeys.detail(taskId);
  const read = () => queryClient.fetchQuery({ queryKey: key, queryFn: () => tasksApi.get(taskId), staleTime: 0 });

  return useMutation({
    scope: { id: `task-${taskId}` },
    onMutate: async (change: TaskChange) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<Task>(key);
      if (before && change.optimistic) queryClient.setQueryData(key, change.optimistic(before));
      return { before };
    },
    mutationFn: async (change: TaskChange) => {
      const task = queryClient.getQueryData<Task>(key) ?? (await read());
      try {
        queryClient.setQueryData(key, await change.run(task));
      } catch (e) {
        if (!isApiError(e) || e.status !== 412) throw e;
        queryClient.setQueryData(key, await change.run(await read()));
      }
    },
    onError: (_error, _change, context) => {
      if (context?.before) queryClient.setQueryData(key, context.before);
      queryClient.invalidateQueries({ queryKey: key });
    },
    onSettled: refetchLists,
  });
}

/**
 * Task detail's Save (M26): every changed field in one PATCH (D56) against `version`, the one the edits started from.
 * The saved task replaces the cached one; lists, collection and tag counts refetch. A 412 reaches the caller, which
 * rereads the task and keeps the edits on top of it.
 */
export function useSaveTask(taskId: Id) {
  const queryClient = useQueryClient();
  const refetchLists = useRefetchTasks();
  const key = taskKeys.detail(taskId);
  return useMutation({
    scope: { id: `task-${taskId}` },
    mutationFn: ({ version, body }: { version: number; body: UpdateTaskRequest }) => tasksApi.update({ id: taskId, version }, body),
    onSuccess: (task) => queryClient.setQueryData(key, task),
    onSettled: () => {
      refetchLists();
      queryClient.invalidateQueries({ queryKey: taskKeys.tags });
    },
  });
}

/** DELETE /tasks/{id}: the task goes to Recently Deleted; `useRestoreTask` brings it back. */
export function useDeleteTask() {
  const refetch = useRefetchTasks();
  return useMutation({ mutationFn: (task: Task) => tasksApi.remove(task), onSettled: refetch });
}

/**
 * Undo for a delete, called from a toast after the screen has closed (so a plain function, not a hook): the
 * deleted task's version comes from Recently Deleted (newest first, so it's on the first page), then POST :restore.
 */
export async function restoreTask(queryClient: QueryClient, taskId: Id): Promise<void> {
  const { items } = await tasksApi.recentlyDeleted(20);
  const item = items.find((x) => x.kind === 'task' && x.id === taskId);
  if (item) await tasksApi.restore(item);
  queryClient.invalidateQueries({ queryKey: taskKeys.views });
  queryClient.invalidateQueries({ queryKey: taskKeys.collections });
}
