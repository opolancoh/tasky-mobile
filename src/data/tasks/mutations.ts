import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/core/http/problem';
import type { Id } from '@/core/types';

import { tasksApi } from './api';
import { taskKeys } from './keys';
import { assignTarget } from './types';
import type { Collection, CreateTaskRequest, DeletedItem, MembersOf, Tag, Task, TaskSummary, Team, UpdateCollectionRequest, UpdateTaskRequest } from './types';

/**
 * Creates a task. Not optimistic (06-mobile.md, Data): the sheet waits for the answer. Afterwards the
 * views, the collections' counts (the Inbox may be new, D59) and the tags (a new name joins them) are refetched.
 * `withoutReminder`: a task created with a due date gets the caller's 9:00 reminder (D31); this
 * removes it right away, for someone who set a due date without a reminder (M19).
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, withoutReminder, assignee }: { body: CreateTaskRequest; withoutReminder?: boolean; assignee?: Id }) => {
      let task = await tasksApi.createTask(body);
      // The task exists either way; if this fails, it keeps the 9:00 reminder, which can be removed later.
      if (withoutReminder) await tasksApi.removeReminder(task.id).catch(() => undefined);
      // Assigned while adding (M43): POST /tasks doesn't take an assignee, so :assign follows.
      if (assignee) task = await tasksApi.assign(task, assignTarget(assignee));
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

/** POST /tasks/{id}:confirm: the assignee completed it for the caller, who saw it (D71). It leaves the open tasks. */
export function useConfirmTask() {
  const refetch = useRefetchTasks();
  return useMutation({ mutationFn: (task: TaskSummary) => tasksApi.confirm(task), onSettled: refetch });
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
 * refetch; declining only drops it from Today and the invitations.
 */
export function useAnswerInvitation() {
  const refetch = useRefetchTasks();
  return useMutation({ mutationFn: ({ id, join }: { id: Id; join: boolean }) => tasksApi.answerInvitation(id, join), onSettled: refetch });
}

/** A command on one task (complete, reopen, skip), for `useChangeTask`. */
export interface TaskChange {
  /**
   * Calls the API with the task as last read (its version is the If-Match). Undefined when the caller no longer sees it
   * (an assignee from outside the list declined it or gave it back, D70).
   */
  run(task: Task): Promise<Task | undefined>;
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
      const keep = (next: Task | undefined) => (next ? queryClient.setQueryData(key, next) : queryClient.removeQueries({ queryKey: key }));
      try {
        keep(await change.run(task));
      } catch (e) {
        if (!isApiError(e) || e.status !== 412) throw e;
        keep(await change.run(await read()));
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
    // The PATCH, then the assignee when it changed (assigning isn't a PATCH field, M43), each on the version the last returned.
    mutationFn: async ({ version, body, assignee }: { version: number; body: UpdateTaskRequest; assignee?: Id | null }) => {
      let task = Object.keys(body).length ? await tasksApi.update({ id: taskId, version }, body) : undefined;
      const current = { id: taskId, version: task?.version ?? version };
      if (assignee !== undefined) task = assignee ? await tasksApi.assign(current, assignTarget(assignee)) : await tasksApi.unassign(current);
      return task ?? tasksApi.get(taskId);
    },
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

/**
 * Changes to collections, teams, people and tags (Browse, M38). Each refetches what it touches: Browse's lists
 * (collections, teams, tags), the task views when tasks move with them, Recently Deleted after a delete or restore.
 */
function useRefetchBrowse() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.collections });
    queryClient.invalidateQueries({ queryKey: taskKeys.teams });
    queryClient.invalidateQueries({ queryKey: taskKeys.tags });
    queryClient.invalidateQueries({ queryKey: taskKeys.views });
  };
}

export const useCreateCollection = () => useMutation({ mutationFn: tasksApi.createCollection, onSettled: useRefetchBrowse() });

export const useUpdateCollection = () =>
  useMutation({ mutationFn: ({ collection, body }: { collection: Collection; body: UpdateCollectionRequest }) => tasksApi.updateCollection(collection, body), onSettled: useRefetchBrowse() });

export const useArchiveCollection = () =>
  useMutation({ mutationFn: ({ collection, archive }: { collection: Collection; archive: boolean }) => tasksApi.archiveCollection(collection, archive), onSettled: useRefetchBrowse() });

export const useDeleteCollection = () => useMutation({ mutationFn: (collection: Collection) => tasksApi.deleteCollection(collection), onSettled: useRefetchBrowse() });

/** The caller's Browse order (collection_position): every collection id in the new order. Optimistic: the list reorders at once. */
export function useReorderCollections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: Id[]) => tasksApi.reorderCollections(ids),
    onMutate: (ids) => {
      const before = queryClient.getQueryData<Collection[]>(taskKeys.collections);
      if (before) queryClient.setQueryData(taskKeys.collections, [...before].sort((a, b) => order(ids, a.id) - order(ids, b.id)));
      return { before };
    },
    onError: (_e, _ids, context) => context?.before && queryClient.setQueryData(taskKeys.collections, context.before),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.collections }),
  });
}

/** The caller's tag order. Optimistic, like collections. */
export function useReorderTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (names: string[]) => tasksApi.reorderTags(names),
    onMutate: (names) => {
      const before = queryClient.getQueryData<Tag[]>(taskKeys.tags);
      if (before) queryClient.setQueryData(taskKeys.tags, [...before].sort((a, b) => order(names, a.name) - order(names, b.name)));
      return { before };
    },
    onError: (_e, _names, context) => context?.before && queryClient.setQueryData(taskKeys.tags, context.before),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.tags }),
  });
}

const order = <T,>(list: T[], x: T) => { const i = list.indexOf(x); return i < 0 ? list.length : i; };

export const useCreateTeam = () => useMutation({ mutationFn: (name: string) => tasksApi.createTeam(name), onSettled: useRefetchBrowse() });

export const useRenameTeam = () => useMutation({ mutationFn: ({ team, name }: { team: Team; name: string }) => tasksApi.renameTeam(team, name), onSettled: useRefetchBrowse() });

export const useDeleteTeam = () => useMutation({ mutationFn: (team: Team) => tasksApi.deleteTeam(team), onSettled: useRefetchBrowse() });

/** Remove someone from a team or collection; on yourself, leave it (its lists leave Browse). */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  const refetch = useRefetchBrowse();
  return useMutation({
    mutationFn: ({ of, userId }: { of: MembersOf; userId: Id }) => tasksApi.removeMember(of, userId),
    onSettled: (_r, _e, { of }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.members(of.kind, of.id) });
      refetch();
    },
  });
}

/** Invite an email to a team or collection, or revoke an open invitation: the open list refetches. */
export function useInvite(of: MembersOf) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => tasksApi.invite(of, email),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.openInvitations(of.kind, of.id) }),
  });
}

export function useRevokeInvitation(of: MembersOf) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => tasksApi.revokeInvitation(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.openInvitations(of.kind, of.id) }),
  });
}

/** A tag's color (the caller's own), name (rename or merge into an existing one) or deletion (D60). */
export const useSaveTag = () => useMutation({ mutationFn: ({ name, color }: { name: string; color: string | null }) => tasksApi.saveTag(name, color), onSettled: useRefetchBrowse() });

export const useRenameTag = () =>
  useMutation({ mutationFn: ({ name, to, merge }: { name: string; to: string; merge: boolean }) => (merge ? tasksApi.mergeTag(name, to) : tasksApi.renameTag(name, to)), onSettled: useRefetchBrowse() });

export const useDeleteTag = () => useMutation({ mutationFn: (name: string) => tasksApi.deleteTag(name), onSettled: useRefetchBrowse() });

/** Restore something from Recently Deleted with its version. */
export const useRestoreItem = () =>
  useMutation({
    mutationFn: (item: DeletedItem) =>
      item.kind === 'task' ? tasksApi.restore(item).then(() => undefined) : item.kind === 'collection' ? tasksApi.restoreCollection(item) : tasksApi.restoreTeam(item),
    onSettled: useRefetchBrowse(),
  });

/** POST /tasks/{id}:reopen from a list (Completed rows). */
export function useReopenTask() {
  const refetch = useRefetchTasks();
  return useMutation({ mutationFn: (task: TaskSummary) => tasksApi.reopen(task), onSettled: refetch });
}
