import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/core/http/problem';
import type { Id } from '@/core/types';

import { tasksApi } from './api';
import { taskKeys } from './keys';
import { moveTask, settleTask, type Move } from './optimistic';
import { assignTarget } from './types';
import type { TaskList, CreateTaskRequest, DeletedItem, MembersOf, OpenInvitation, Tag, Task, TaskSummary, Team, TeamRole, UpdateTaskListRequest, UpdateTaskRequest } from './types';

/**
 * Creates a task. Not optimistic (06-mobile.md, Data): the sheet waits for the answer. Afterwards the
 * views, the task lists' counts (the Inbox may be new, D59) and the tags (a new name joins them) are refetched.
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
      queryClient.invalidateQueries({ queryKey: taskKeys.taskLists });
      queryClient.invalidateQueries({ queryKey: taskKeys.tags });
    },
  });
}

/** After any change to a task: every list and the task lists' counts are refetched. */
function useRefetchTasks() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.views });
    queryClient.invalidateQueries({ queryKey: taskKeys.taskLists });
  };
}

/**
 * A toggle that shows at once (M56, M75): `onMutate` moves the task in every cache (`moveTask`), an error puts them back
 * and shows a toast (`meta.toastError`, app/queryClient.ts). The answer's version goes into the caches, and the mutation
 * stays pending until the refetch is in: rows read that (`key`) and keep the task locked, so a second tap never sends a
 * stale version or races the first one.
 */
function useTaskToggle(key: readonly string[], send: (task: TaskSummary) => Promise<Task>, to: Move) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: key,
    mutationFn: send,
    onMutate: (task: TaskSummary) => moveTask(queryClient, task, to),
    onSuccess: (saved) => settleTask(queryClient, saved),
    onError: (_error, _task, restore) => restore?.(),
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: taskKeys.views }),
      queryClient.invalidateQueries({ queryKey: taskKeys.taskLists }),
    ]),
    meta: { toastError: true },
  });
}

/** POST /tasks/{id}:complete. */
export const useCompleteTask = () => useTaskToggle(taskKeys.completing, tasksApi.complete, 'completed');

/** POST /tasks/{id}:confirm: the assignee completed it for the caller, who saw it (D71). It leaves the open tasks. */
export const useConfirmTask = () => useTaskToggle(taskKeys.confirming, tasksApi.confirm, 'completed');

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
 * Join or decline an invitation (D68). Joining adds task lists (and maybe a team), so every list and the task lists
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
  /** Complete or reopen (M75): the circle shows the spinner and takes no taps until the answer. */
  toggle?: boolean;
  /** The task as it should look right away; rolled back if the command fails (06-mobile.md, Data). */
  optimistic?(task: Task): Task;
}

/**
 * Runs a command on one task (Task detail's circle and Skip), one at a time (`scope`), against the latest version.
 * A 412 rereads the task and runs it once more. Afterwards every list and the task lists' counts refetch.
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
 * The saved task replaces the cached one; lists, task list and tag counts refetch. A 412 reaches the caller, which
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
  queryClient.invalidateQueries({ queryKey: taskKeys.taskLists });
}

/**
 * Changes to task lists, teams, people and tags (Browse, M38). Each refetches what it touches: Browse's lists
 * (task lists, teams, tags), the task views when tasks move with them, Recently Deleted after a delete or restore.
 */
function useRefetchBrowse() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.taskLists });
    queryClient.invalidateQueries({ queryKey: taskKeys.teams });
    queryClient.invalidateQueries({ queryKey: taskKeys.tags });
    queryClient.invalidateQueries({ queryKey: taskKeys.views });
  };
}

export const useCreateTaskList = () => useMutation({ mutationFn: tasksApi.createTaskList, onSettled: useRefetchBrowse() });

export const useUpdateTaskList = () =>
  useMutation({ mutationFn: ({ taskList, body }: { taskList: TaskList; body: UpdateTaskListRequest }) => tasksApi.updateTaskList(taskList, body), onSettled: useRefetchBrowse() });

export const useArchiveTaskList = () =>
  useMutation({ mutationFn: ({ taskList, archive }: { taskList: TaskList; archive: boolean }) => tasksApi.archiveTaskList(taskList, archive), onSettled: useRefetchBrowse() });

export const useDeleteTaskList = () => useMutation({ mutationFn: (taskList: TaskList) => tasksApi.deleteTaskList(taskList), onSettled: useRefetchBrowse() });

/** The caller's Browse order (task_list_position): every task list id in the new order. Optimistic: the list reorders at once. */
export function useReorderTaskLists() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: Id[]) => tasksApi.reorderTaskLists(ids),
    onMutate: (ids) => {
      const before = queryClient.getQueryData<TaskList[]>(taskKeys.taskLists);
      if (before) queryClient.setQueryData(taskKeys.taskLists, [...before].sort((a, b) => order(ids, a.id) - order(ids, b.id)));
      return { before };
    },
    onError: (_e, _ids, context) => context?.before && queryClient.setQueryData(taskKeys.taskLists, context.before),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.taskLists }),
  });
}

/** The caller's tag order. Optimistic, like task lists. */
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

/** Remove someone from a team or task list; on yourself, leave it (its lists leave Browse). */
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

/** Make someone in a team Admin or Member (the owner): its people refetch. */
export function useChangeTeamRole(teamId: Id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: Id; role: Exclude<TeamRole, 'owner'> }) => tasksApi.changeTeamRole(teamId, userId, role),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.members('team', teamId) }),
  });
}

/** Hand a team to another member (the owner becomes Admin): its people and the user's teams refetch (the role changed). */
export function useTransferTeam() {
  const queryClient = useQueryClient();
  const refetch = useRefetchBrowse();
  return useMutation({
    mutationFn: ({ team, userId }: { team: Team; userId: Id }) => tasksApi.transferTeam(team, userId),
    onSettled: (_r, _e, { team }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.members('team', team.id) });
      refetch();
    },
  });
}

/** Invite an email to a team or task list, or revoke an open invitation: the open list refetches. */
/**
 * Invite by email (M56). `again`: that email already had an open invitation, which the API replaced (a new email goes
 * out). The new invitation joins the open ones at once, in place of the old one, even if the screen has closed.
 */
export function useInvite(of: MembersOf) {
  const queryClient = useQueryClient();
  const key = taskKeys.openInvitations(of.kind, of.id);
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  return useMutation({
    mutationFn: async (email: string) => {
      const again = !!queryClient.getQueryData<OpenInvitation[]>(key)?.some((x) => same(x.email, email));
      return { invitation: await tasksApi.invite(of, email), again };
    },
    onSuccess: ({ invitation }) =>
      queryClient.setQueryData<OpenInvitation[]>(key, (open) => [...(open ?? []).filter((x) => !same(x.email, invitation.email)), invitation]),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/**
 * Invites by user id (D89): someone picked from GET /people, or the people with tasks given from a list being shared
 * (D88, M71: "Invite them too"). The open invitations refetch.
 */
export function useInvitePeople(of: MembersOf) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: Id[]) => Promise.all(userIds.map((userId) => tasksApi.inviteUser(of, userId))),
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
      item.kind === 'task' ? tasksApi.restore(item).then(() => undefined) : item.kind === 'taskList' ? tasksApi.restoreTaskList(item) : tasksApi.restoreTeam(item),
    onSettled: useRefetchBrowse(),
  });

/** POST /tasks/{id}:reopen from a list (Completed rows, search). */
export const useReopenTask = () => useTaskToggle(taskKeys.reopening, tasksApi.reopen, 'open');
