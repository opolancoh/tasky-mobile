import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';

import type { Id } from '@/core/types';

import { taskKeys } from './keys';
import type { Home, Task, TaskFilter, TaskList, TaskSummary } from './types';

/** Where a toggle moves a task (M56, M75): out of the open lists into Completed, or back. */
export type Move = 'completed' | 'open';

type Page = { items: TaskSummary[]; total?: number | null };
type Kind = 'open' | 'completed' | 'any';

const isPage = (d: unknown): d is Page => !!d && Array.isArray((d as Page).items);
const isPages = (d: unknown): d is InfiniteData<Page> => !!d && Array.isArray((d as InfiniteData<Page>).pages);

/** What a cached list holds: GET /tasks by its filter (open unless `status=completed`); search and Home sections hold both. */
function kindOf(key: QueryKey): { kind: Kind; filter?: TaskFilter } {
  const third = key[2];
  if (third && typeof third === 'object') {
    const filter = third as TaskFilter;
    return { kind: filter.status === 'completed' ? 'completed' : 'open', filter };
  }
  return { kind: third === 'search' ? 'any' : 'open' };
}

/** Whether a completed task belongs at the top of this completed list: everything, or its own list's Completed. */
const takes = (filter: TaskFilter | undefined, task: TaskSummary) => {
  if (!filter) return false;
  const { status, limit, sort, taskListId, ...narrowing } = filter;
  void status; void limit; void sort;
  return !Object.keys(narrowing).length && (!taskListId || taskListId === task.taskList?.id);
};

/** One page: the task out (`remove`), in at the top (`insert`), or its status changed in place. */
function editPage<P extends Page>(page: P, id: Id, change: 'remove' | 'insert' | 'status', task: TaskSummary): P {
  const has = page.items.some((x) => x.id === id);
  if (change === 'remove') return has ? { ...page, items: page.items.filter((x) => x.id !== id), total: page.total == null ? page.total : page.total - 1 } : page;
  if (change === 'insert') return has ? page : { ...page, items: [task, ...page.items], total: page.total == null ? page.total : page.total + 1 };
  return has ? { ...page, items: page.items.map((x) => (x.id === id ? { ...x, status: task.status, awaitsConfirmation: false } : x)) } : page;
}

function editList(data: unknown, kind: Kind, filter: TaskFilter | undefined, moved: TaskSummary, to: Move): unknown {
  const change = kind === 'any' ? 'status' : kind === to ? (takes(filter, moved) ? 'insert' : null) : 'remove';
  if (!change) return data;
  if (isPage(data)) return editPage(data, moved.id, change, moved);
  if (isPages(data)) {
    const pages = data.pages.map((p, i) => (change === 'insert' && i > 0 ? p : editPage(p, moved.id, change, moved)));
    return { ...data, pages };
  }
  return data;
}

/** Home (GET /home): a completed task leaves its sections at once; its counts follow. Reopening waits for the refetch. */
function editHome(home: Home, moved: TaskSummary, to: Move, wasWaiting: boolean): Home {
  if (to !== 'completed') return home;
  const out = (p: Home['today']) => editPage(p, moved.id, 'remove', moved);
  const wasToday = home.today.items.some((x) => x.id === moved.id);
  return {
    ...home,
    toAnswer: out(home.toAnswer), followUp: out(home.followUp), overdue: out(home.overdue), today: out(home.today), comingUp: out(home.comingUp), assigned: out(home.assigned),
    doneToday: wasToday ? home.doneToday + 1 : home.doneToday,
    inboxTotal: moved.taskList?.isInbox && !wasWaiting ? Math.max(0, home.inboxTotal - 1) : home.inboxTotal,
    openTotal: wasWaiting ? home.openTotal : Math.max(0, home.openTotal - 1),
  };
}

/** The API's answer: its version (and status) on every cached row of the task, so the next command sends the right If-Match. */
export function settleTask(queryClient: QueryClient, saved: Task) {
  const patch = (x: TaskSummary) => (x.id === saved.id ? { ...x, version: saved.version, status: saved.status } : x);
  const fix = (d: unknown): unknown => {
    if (isPage(d)) return d.items.some((x) => x.id === saved.id) ? { ...d, items: d.items.map(patch) } : d;
    if (isPages(d)) return { ...d, pages: d.pages.map((p) => fix(p) as Page) };
    if (d && typeof d === 'object' && 'today' in d) {
      const home = d as Home;
      const section = (p: Home['today']) => fix(p) as Home['today'];
      return { ...home, toAnswer: section(home.toAnswer), followUp: section(home.followUp), overdue: section(home.overdue), today: section(home.today), comingUp: section(home.comingUp), assigned: section(home.assigned) };
    }
    return d;
  };
  for (const [key, data] of queryClient.getQueriesData({ queryKey: taskKeys.views })) {
    const next = fix(data);
    if (next !== data) queryClient.setQueryData(key, next);
  }
  queryClient.setQueryData(taskKeys.detail(saved.id), saved);
}

/**
 * A toggle shows at once (M56, M75): every cached list, Home, the task list counts and Task detail move the task now, and
 * the refetch afterwards only confirms it. Returns `restore`, which puts every cache back when the API says no.
 */
export async function moveTask(queryClient: QueryClient, task: TaskSummary, to: Move): Promise<() => void> {
  // Completing a repeating task moves it to its next date, which only the API knows: it waits for the refetch.
  if (to === 'completed' && task.repeats && !task.awaitsConfirmation) return () => {};
  // A refetch already on its way would write the old state over this one.
  await queryClient.cancelQueries({ queryKey: taskKeys.views });
  const moved: TaskSummary = { ...task, status: to === 'completed' ? 'completed' : 'open', awaitsConfirmation: false };
  const before: [QueryKey, unknown][] = [];
  const set = (key: QueryKey, data: unknown, next: unknown) => {
    if (next === data) return;
    before.push([key, data]);
    queryClient.setQueryData(key, next);
  };

  for (const [key, data] of queryClient.getQueriesData({ queryKey: taskKeys.views })) {
    if (key.length === 3 && key[2] === 'home') set(key, data, editHome(data as Home, moved, to, task.awaitsConfirmation));
    else if (data) {
      const { kind, filter } = kindOf(key);
      set(key, data, editList(data, kind, filter, moved, to));
    }
  }

  // The list's counts (Spaces, Show completed); a task waiting for confirmation was already completed.
  const lists = queryClient.getQueryData<TaskList[]>(taskKeys.taskLists);
  const listId = task.taskList?.id;
  if (lists && listId && !task.awaitsConfirmation) {
    const step = to === 'completed' ? 1 : -1;
    set(taskKeys.taskLists, lists, lists.map((c) => (c.id === listId
      ? { ...c, openTasks: Math.max(0, (c.openTasks ?? 0) - step), completedTasks: Math.max(0, (c.completedTasks ?? 0) + step) }
      : c)));
  }

  const detail = queryClient.getQueryData<Task>(taskKeys.detail(task.id));
  if (detail) set(taskKeys.detail(task.id), detail, { ...detail, status: moved.status, awaitsConfirmation: false });

  return () => before.forEach(([key, data]) => queryClient.setQueryData(key, data));
}
