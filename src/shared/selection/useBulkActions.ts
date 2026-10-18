import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { todayIn } from '@/core/dates/localDate';
import type { LocalDate } from '@/core/types';
import { tasksApi } from '@/data/tasks/api';
import { taskKeys } from '@/data/tasks/keys';
import { cachedTask, editRows, settleTask, type RowsWhere } from '@/data/tasks/optimistic';
import type { Task, TaskList, TaskSummary, UserRef } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { holdable } from '@/shared/hold/useHoldActions';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { errorMessage } from '@/shared/i18n/errors';
import { confirm, useToast } from '@/shared/ui';

import { pickedTasks, useSelection, type BulkVerb } from './selectionStore';

/** Requests at a time (M81). */
const AT_ONCE = 4;
/** Over this many tasks the bar shows "Moving 7 of 23". */
const SHOW_PROGRESS = 10;

/** Runs `work` on every item, `AT_ONCE` at a time. */
async function pool<T>(items: T[], work: (item: T) => Promise<void>) {
  let next = 0;
  const lane = async () => {
    while (next < items.length) await work(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(AT_ONCE, items.length) }, lane));
}

interface Done {
  task: TaskSummary;
  saved: Task | undefined;
}

/** Leaves no list: changes the row in place. */
const stays = () => false;
/** Out of every task list and Home; Search changes the row in place. */
const leavesLists = (w: RowsWhere) => !w.search;

/**
 * Bulk actions (M81, Proposed Features #4): the selection bar's Complete, Date, Assign, Move, Flag, Put on hold and
 * Delete on the picked tasks. The existing endpoints, one task at a time with each task's newest cached version,
 * 4 at a time; every row changes at once (as M75) and a failed task rolls back alone. Afterwards the lists refetch;
 * the failed tasks stay selected (a 412 is a failure: no retry), and one toast says what was done, with one Undo for
 * the whole change (not Assign, which asks first and notifies).
 */
export function useBulkActions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const labels = useDateLabels(today);
  const cancelLabel = t('common.cancel');

  const refetch = (tasks: TaskSummary[]) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.views });
    queryClient.invalidateQueries({ queryKey: taskKeys.taskLists });
    queryClient.invalidateQueries({ queryKey: ['tasks', 'members'] });
    tasks.forEach((x) => queryClient.invalidateQueries({ queryKey: taskKeys.detail(x.id) }));
  };

  /** One batch: optimistic `patch` (and where the row `leaves`), `send` per task, then the refetch and the selection left. */
  const run = async (
    verb: BulkVerb,
    tasks: TaskSummary[],
    send: (task: TaskSummary) => Promise<Task | undefined | void>,
    patch?: (task: TaskSummary) => Partial<TaskSummary> | null,
    leaves: (where: RowsWhere) => boolean = stays,
  ) => {
    const store = useSelection.setState;
    const total = tasks.length;
    const showing = total > SHOW_PROGRESS;
    store({ running: true, sheet: null, progress: showing ? { verb, done: 0, total } : null });
    await queryClient.cancelQueries({ queryKey: taskKeys.views });   // a refetch on its way would write the old rows back
    // Each task's newest version, read before its row changes or leaves the lists.
    const fresh = new Map(tasks.map((x) => [x.id, cachedTask(queryClient, x.id) ?? x]));
    const undos = new Map(tasks.map((x) => {
      const p = patch?.(x);
      return [x.id, p ? editRows(queryClient, x.id, p, leaves) : undefined] as const;
    }));
    const ok: Done[] = [];
    const failed: TaskSummary[] = [];
    let error: unknown;
    let count = 0;
    await pool(tasks, async (task) => {
      try {
        const saved = await send(fresh.get(task.id) ?? task);
        ok.push({ task, saved: saved ?? undefined });
      } catch (e) {
        failed.push(task);
        error ??= e;
        undos.get(task.id)?.();
      }
      count += 1;
      if (showing) store({ progress: { verb, done: count, total } });
    });
    ok.forEach((d) => d.saved && settleTask(queryClient, d.saved));
    refetch(tasks);
    store({ running: false, progress: null });
    if (failed.length) useSelection.getState().setPicked(failed);
    else useSelection.getState().end();
    return { ok, failed, error };
  };

  /** Puts every done task back (one Undo for the whole change), 4 at a time, then refetches. */
  const undoAll = async (done: Done[], back: (d: Done) => Promise<unknown>) => {
    let failed = 0;
    await pool(done, async (d) => {
      try { await back(d); } catch { failed += 1; }
    });
    refetch(done.map((d) => d.task));
    if (failed) useToast.getState().show({ message: t('select.undoFailed', { count: failed }) });
  };

  /** The toast: what was done, "· 1 couldn't be", and Undo. All failed: why. */
  const report = (r: Awaited<ReturnType<typeof run>>, message: (count: number) => string, back?: (d: Done) => Promise<unknown>, extra?: string) => {
    if (!r.ok.length) return useToast.getState().show({ message: errorMessage(r.error) });
    const text = [message(r.ok.length), r.failed.length ? t('select.couldnt', { count: r.failed.length }) : '', extra ?? ''].filter(Boolean).join(' · ');
    useToast.getState().show({ message: text, action: back ? { label: t('common.undo'), onPress: () => undoAll(r.ok, back) } : undefined });
  };

  const complete = async () => {
    const tasks = pickedTasks();
    // A repeating task moves to its next date, which only the API knows: it waits for the refetch (M75).
    const r = await run('complete', tasks, tasksApi.complete, (x) => (x.repeats ? null : { status: 'completed' }), leavesLists);
    report(r, (count) => t('select.done.complete', { count }), (d) => (d.saved ? tasksApi.reopen(d.saved) : Promise.resolve()));
  };

  /** One date for all; null clears it (and a repeat, which needs one). */
  const setDate = async (date: LocalDate | null) => {
    const tasks = pickedTasks().filter((x) => x.dueDate !== date);
    if (!tasks.length) return useSelection.getState().end();
    const r = await run('date', tasks, (x) => tasksApi.update(x, { dueDate: date, ...(!date && x.repeats ? { repeat: null } : {}) }), () => ({ dueDate: date }));
    report(r, (count) => (date ? t('select.done.date', { count, date: labels.day(date) }) : t('select.done.noDate', { count })), (d) => (d.saved ? tasksApi.update(d.saved, { dueDate: d.task.dueDate }) : Promise.resolve()));
  };

  /** Asks first ("Assign 6 tasks to Luis?"), no Undo: each assignee is told. `null` unassigns. */
  const assign = async (person: UserRef | null) => {
    const tasks = pickedTasks().filter((x) => (x.assignee?.id ?? null) !== (person?.id ?? null));
    if (!tasks.length) return useSelection.getState().end();
    const yours = person?.id === me?.id;
    if (person) {
      const ok = await confirm({
        title: yours ? t('select.assignMeTitle', { count: tasks.length }) : t('select.assignTitle', { count: tasks.length, name: person.displayName.split(' ')[0] }),
        message: yours ? t('select.assignMeBody') : t('select.assignBody', { name: person.displayName.split(' ')[0] }),
        confirmLabel: t('select.assign'),
        cancelLabel,
        destructive: false,
      });
      if (!ok) return;
    }
    const r = await run('assign', tasks, (x) => (person ? tasksApi.assign(x, person.id) : tasksApi.unassign(x)), () => ({ assignee: person, assignmentStatus: null }));
    report(r, (count) => (!person ? t('select.done.unassign', { count }) : yours ? t('select.done.assignMe', { count }) : t('select.done.assign', { count, name: person.displayName.split(' ')[0] })));
  };

  const move = async (to: TaskList) => {
    const tasks = pickedTasks().filter((x) => x.taskList?.id !== to.id);
    if (!tasks.length) return useSelection.getState().end();
    const name = to.isInbox ? t('browse.inbox') : to.name;
    // Out of its old list's screen; elsewhere it shows its new list until the refetch.
    const r = await run('move', tasks, (x) => tasksApi.move(x, to.id), () => ({ taskList: { id: to.id, name, color: to.color, isInbox: to.isInbox, team: to.team } }), (w) => !!w.filter?.taskListId);
    report(r, (count) => t('select.done.move', { count, name }), (d) => (d.saved && d.task.taskList ? tasksApi.move(d.saved, d.task.taskList.id) : Promise.resolve()));
  };

  /** Flag is Important; Unflag when all are flagged. */
  const flag = async () => {
    const picked = pickedTasks();
    const on = !picked.every((x) => x.isImportant);
    const tasks = picked.filter((x) => x.isImportant !== on);
    const r = await run('flag', tasks, (x) => tasksApi.update(x, { isImportant: on }), () => ({ isImportant: on }));
    report(r, (count) => t(on ? 'select.done.flag' : 'select.done.unflag', { count }), (d) => (d.saved ? tasksApi.update(d.saved, { isImportant: !on }) : Promise.resolve()));
  };

  /** Only tasks in shared and team lists (M80); the others are left as they are. */
  const hold = async (reason: string) => {
    const picked = pickedTasks();
    const tasks = picked.filter((x) => holdable(queryClient, x));
    const skipped = picked.length - tasks.length;
    if (!tasks.length) return useToast.getState().show({ message: t('select.cantHold') });
    // Out of a list's open tasks (into its On hold section with the refetch); in place elsewhere.
    const r = await run('hold', tasks, (x) => tasksApi.hold(x, { reason, until: null, resumerId: null }), () => ({ status: 'onHold', holdReason: reason }), (w) => w.home || (!!w.filter?.taskListId && w.filter.status !== 'onHold'));
    report(r, (count) => t('select.done.hold', { count, reason }), (d) => (d.saved ? tasksApi.resume(d.saved) : Promise.resolve()), skipped ? t('select.skipped', { count: skipped }) : undefined);
  };

  /** Asks first; then Recently Deleted, with Undo. */
  const remove = async () => {
    const tasks = pickedTasks();
    const ok = await confirm({ title: t('select.deleteTitle', { count: tasks.length }), message: t('select.deleteBody'), confirmLabel: t('select.delete', { count: tasks.length }), cancelLabel });
    if (!ok) return;
    const r = await run('delete', tasks, (x) => tasksApi.remove(x), () => ({}), () => true);
    const restore = async () => {
      // Each one's version comes from Recently Deleted (newest first).
      const { items } = await tasksApi.recentlyDeleted(200);
      return new Map(items.filter((x) => x.kind === 'task').map((x) => [x.id, x]));
    };
    let deleted: ReturnType<typeof restore> | undefined;
    report(r, (count) => t('select.done.delete', { count }), async (d) => {
      deleted ??= restore();
      const item = (await deleted).get(d.task.id);
      if (item) await tasksApi.restore(item);
    });
  };

  return { complete, setDate, assign, move, flag, hold, remove };
}
