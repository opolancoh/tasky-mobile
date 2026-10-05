import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/core/http/problem';
import type { Id } from '@/core/types';

import { tasksApi } from './api';
import { taskKeys } from './keys';
import type { CreateTaskRequest, Task, TaskSummary, UpdateTaskRequest } from './types';

/**
 * Creates a task. Not optimistic (06-mobile.md, Data): the sheet waits for the answer. Afterwards the
 * views, the collections' counts and the tags (a #tag may have created one) are refetched.
 * `withoutReminder`: a task created with a due date gets the caller's 9:00 reminder (D31); this
 * removes it right away, for someone who set a due date without a reminder (M19).
 */
export function useCreateTask(workspaceId: Id | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, withoutReminder }: { body: CreateTaskRequest; withoutReminder?: boolean }) => {
      const task = await tasksApi.createTask(body);
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

/** A change to one task, for `useChangeTask`. */
export interface TaskChange {
  /** Calls the API with the task as last read (its version is the If-Match). May make several calls. */
  run(task: Task): Promise<unknown>;
  /** The task as it should look right away; rolled back if the change fails (06-mobile.md, Data). */
  optimistic?(task: Task): Task;
}

const isTask = (x: unknown): x is Task => typeof x === 'object' && x !== null && 'version' in x && 'steps' in x;

/**
 * Changes one task (Task detail). Changes run one at a time, in order (`scope`), each against the latest
 * version: a returned task replaces the cached one; otherwise (steps, tags) the task is read again, since
 * those change its version too. A 412 rereads the task and runs the change once more on it; a second
 * 412 reaches the screen ("This task changed"). Afterwards every list, the collections' and tags' counts refetch
 * (a tag change may have created a tag). Callbacks live here, not on `mutate`, so they run after a sheet closes.
 */
export function useChangeTask(workspaceId: Id | undefined, taskId: Id) {
  const queryClient = useQueryClient();
  const refetchLists = useRefetchTasks(workspaceId);
  const key = taskKeys.detail(workspaceId ?? '', taskId);
  const read = () => queryClient.fetchQuery({ queryKey: key, queryFn: () => tasksApi.get(taskId), staleTime: 0 });
  const apply = async (result: unknown) => {
    if (isTask(result)) queryClient.setQueryData(key, result);
    else await read();
  };

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
        await apply(await change.run(task));
      } catch (e) {
        if (!isApiError(e) || e.status !== 412) throw e;
        await apply(await change.run(await read()));
      }
    },
    onError: (_error, _change, context) => {
      if (context?.before) queryClient.setQueryData(key, context.before);
      queryClient.invalidateQueries({ queryKey: key });
    },
    onSettled: () => {
      refetchLists();
      if (workspaceId) queryClient.invalidateQueries({ queryKey: taskKeys.tags(workspaceId) });
    },
  });
}

/** DELETE /tasks/{id}: the task goes to Recently Deleted; `useRestoreTask` brings it back. */
export function useDeleteTask(workspaceId: Id | undefined) {
  const refetch = useRefetchTasks(workspaceId);
  return useMutation({ mutationFn: (task: Task) => tasksApi.remove(task), onSettled: refetch });
}

/**
 * Undo for a delete, called from a toast after the screen has closed (so a plain function, not a hook): the
 * deleted task's version comes from Recently Deleted (newest first, so it's on the first page), then POST :restore.
 */
export async function restoreTask(queryClient: QueryClient, workspaceId: Id, taskId: Id): Promise<void> {
  const { items } = await tasksApi.recentlyDeleted(workspaceId, 20);
  const item = items.find((x) => x.kind === 'task' && x.id === taskId);
  if (item) await tasksApi.restore(item);
  queryClient.invalidateQueries({ queryKey: taskKeys.views(workspaceId) });
  queryClient.invalidateQueries({ queryKey: taskKeys.collections(workspaceId) });
}
