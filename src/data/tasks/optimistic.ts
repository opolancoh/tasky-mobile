import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';

import { collator } from '@/core/text/collate';
import type { Id, LocalDate } from '@/core/types';

import { taskKeys } from './keys';
import type { Home, SortMode, Task, TaskFilter, TaskList, TaskSummary } from './types';

/** Where a toggle moves a task (M56, M75): out of the open lists into Completed, or back. */
export type Move = 'completed' | 'open';

type Page = { items: TaskSummary[]; total?: number | null; nextCursor?: string | null };
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

/** Home (GET /home, D107): a completed task leaves its requests at once; the numbers follow with the refetch. Reopening waits for it. */
function editHome(home: Home, moved: TaskSummary, to: Move): Home {
  if (to !== 'completed') return home;
  const out = (rows: TaskSummary[]) => (rows.some((x) => x.id === moved.id) ? rows.filter((x) => x.id !== moved.id) : rows);
  const r = home.requests;
  const requests = { ...r, toAnswer: out(r.toAnswer), followUp: out(r.followUp), holds: out(r.holds) };
  const gone = r.toAnswer.length + r.followUp.length + r.holds.length - (requests.toAnswer.length + requests.followUp.length + requests.holds.length);
  return gone ? { ...home, requests: { ...requests, total: Math.max(0, r.total - gone) } } : home;
}

/** The API's answer: its version (and status) on every cached row of the task, so the next command sends the right If-Match. */
export function settleTask(queryClient: QueryClient, saved: Task) {
  const patch = (x: TaskSummary) => (x.id === saved.id ? { ...x, version: saved.version, status: saved.status } : x);
  const fix = (d: unknown): unknown => {
    if (isPage(d)) return d.items.some((x) => x.id === saved.id) ? { ...d, items: d.items.map(patch) } : d;
    if (isPages(d)) return { ...d, pages: d.pages.map((p) => fix(p) as Page) };
    if (d && typeof d === 'object' && 'requests' in d) {
      const home = d as Home, r = home.requests;
      const rows = (xs: TaskSummary[]) => (xs.some((x) => x.id === saved.id) ? xs.map(patch) : xs);
      return { ...home, requests: { ...r, toAnswer: rows(r.toAnswer), followUp: rows(r.followUp), holds: rows(r.holds) } };
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

  // Today's Completed (M105): a task leaving Today lands at its top, and back; done today counts it now.
  const doneKey = taskKeys.homeSection('done-today');
  const inToday = holds(queryClient.getQueryData(taskKeys.homeSection('today')), task.id);
  const inDone = holds(queryClient.getQueryData(doneKey), task.id);
  const step = to === 'completed' ? (inToday ? 1 : 0) : inDone ? -1 : 0;
  if (step) {
    const done = queryClient.getQueryData<InfiniteData<Page>>(doneKey);
    const change = to === 'completed' ? 'insert' : 'remove';
    set(doneKey, done, done
      ? { ...done, pages: done.pages.map((p, i) => (change === 'insert' && i > 0 ? p : editPage(p, moved.id, change, moved))) }
      : { pages: [{ items: [moved], total: 1, nextCursor: null }], pageParams: [undefined] });
  }

  for (const [key, data] of queryClient.getQueriesData({ queryKey: taskKeys.views })) {
    if (key.length === 3 && key[2] === 'home') {
      const home = editHome(data as Home, moved, to);
      set(key, data, step ? { ...home, counts: { ...home.counts, today: Math.max(0, home.counts.today - step), doneToday: Math.max(0, home.counts.doneToday + step) } } : home);
    } else if (data && key[3] !== 'done-today') {
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

/** Where a cached list sits, for `editRows`: its GET /tasks filter, or Search, or Home and its sections. */
export interface RowsWhere {
  filter?: TaskFilter;
  search: boolean;
  home: boolean;
}

/** Every row of Home's requests through `edit` (D107: Home's only task rows). */
const editHomeRows = (home: Home, edit: (p: Page) => Page): Home => {
  const rows = (items: TaskSummary[]) => edit({ items, nextCursor: null, total: null } as Page).items;
  const r = home.requests;
  return { ...home, requests: { ...r, toAnswer: rows(r.toAnswer), followUp: rows(r.followUp), holds: rows(r.holds) } };
};

/** Every cached list a task row can be in, with where it sits (not Recently Deleted or the invitations). */
function eachList(queryClient: QueryClient, visit: (key: QueryKey, data: unknown, where: RowsWhere) => void) {
  for (const [key, data] of queryClient.getQueriesData({ queryKey: taskKeys.views })) {
    if (!data || key[2] === 'deleted' || key[2] === 'invitations') continue;
    const home = key[2] === 'home';
    const filter = typeof key[2] === 'object' ? (key[2] as TaskFilter) : undefined;
    visit(key, data, { filter, search: key[2] === 'search', home });
  }
}

/** One cached list (a page, pages, or Home) with each page through `edit`. */
function editData(data: unknown, edit: (p: Page) => Page): unknown {
  if (isPage(data)) return edit(data);
  if (isPages(data)) return { ...data, pages: data.pages.map(edit) };
  if (data && typeof data === 'object' && 'requests' in data) return editHomeRows(data as Home, edit);
  return data;
}

/** The task's row as last cached, the newest version wherever it shows: what the next command sends as If-Match. */
export function cachedTask(queryClient: QueryClient, id: Id): TaskSummary | undefined {
  let found: TaskSummary | undefined;
  eachList(queryClient, (_key, data) => editData(data, (p) => {
    const x = p.items.find((i) => i.id === id);
    if (x && (!found || x.version > found.version)) found = x;
    return p;
  }));
  return found;
}

/**
 * Bulk actions (M81): one task changes at once in every cached list: `patch` on its row in place, or out of the lists
 * where `leaves` says. Synchronous: the caller cancels the refetches once for the whole batch. Returns `undo`, which puts
 * back only this task's row where it still is (one failed task rolls back, the others keep theirs); a row taken out comes
 * back with the refetch that follows every batch.
 */
export function editRows(queryClient: QueryClient, id: Id, patch: Partial<TaskSummary>, leaves: (where: RowsWhere) => boolean): () => void {
  let original: TaskSummary | undefined;
  const changed: QueryKey[] = [];
  eachList(queryClient, (key, data, where) => {
    const out = leaves(where);
    let hit = false;
    const next = editData(data, (p) => {
      const x = p.items.find((i) => i.id === id);
      if (!x) return p;
      hit = true;
      original ??= x;
      return out ? editPage(p, id, 'remove', x) : { ...p, items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) };
    });
    if (!hit) return;
    changed.push(key);
    queryClient.setQueryData(key, next);
  });
  return () => {
    if (!original) return;
    const back = original;
    changed.forEach((key) => queryClient.setQueryData(key, (data: unknown) => editData(data, (p) => (p.items.some((i) => i.id === id) ? { ...p, items: p.items.map((i) => (i.id === id ? back : i)) } : p))));
  };
}

/** A full task as its row (TaskSummaryResponse), for the API's answer to a create (M100). */
export const toSummary = (t: Task): TaskSummary => ({
  id: t.id, kind: t.kind, taskList: t.taskList, title: t.title, hasNotes: !!t.notes, isImportant: t.isImportant, dueDate: t.dueDate ?? null,
  repeats: !!t.repeat, status: t.status, completedAt: t.completedAt ?? null, assignee: t.assignee, assignmentStatus: t.assignmentStatus ?? null,
  assignedBy: t.assignedBy, declineReason: t.declineReason, awaitsConfirmation: t.awaitsConfirmation, invitedEmail: t.invitedEmail,
  stepsDone: t.steps.filter((x) => x.isDone).length, stepsTotal: t.steps.length, tags: t.tags, version: t.version, reminder: t.reminder,
  holdReason: t.holdReason, holdUntil: t.holdUntil, resumer: t.resumer, commentCount: t.commentCount,
});

/** What placing a new task needs beyond its row (M100): the caller's today, whether its list is theirs alone, its sort. */
export interface NewTaskPlace {
  today: LocalDate | undefined;
  /** Inbox or a private list: `mine=true` and Important take it. */
  mine: boolean;
  sortMode: SortMode | undefined;
}

/**
 * Whether a new open task belongs in a list fetched with `filter` (GET /tasks): every narrowing a row can answer by
 * itself. Undefined when the app can't tell (another assignee, `assignment`, `assignedBy`): that list waits for the refetch.
 */
export function takesNew(filter: TaskFilter, task: TaskSummary, place: NewTaskPlace): boolean | undefined {
  const { kind, taskListId, teamId, mine, status, important, due, dueFrom, dueTo, tag, assignee, sort, limit, ...rest } = filter;
  void sort; void limit;
  if ((kind ?? 'task') !== task.kind) return false;   // a reminder is in no task list (D110)
  if (task.kind === 'reminder') return undefined;   // the reminders' own lists wait for the refetch
  if (Object.keys(rest).length || (assignee && assignee !== 'none')) return undefined;
  if (status && status !== 'open') return false;
  if (taskListId && taskListId !== task.taskList?.id) return false;
  if (teamId && teamId !== task.taskList?.team?.id) return false;
  if (mine && !place.mine) return false;
  if (important !== undefined && important !== task.isImportant) return false;
  if (tag && !task.tags.some((x) => x.name.toLowerCase() === tag.toLowerCase())) return false;
  if (assignee === 'none' && (task.assignee || task.invitedEmail)) return false;
  const d = task.dueDate;
  if ((dueFrom && (!d || d < dueFrom)) || (dueTo && (!d || d > dueTo))) return false;
  if (due?.length) {
    const today = place.today;
    if (!today) return undefined;
    if (!due.includes(!d ? 'none' : d < today ? 'overdue' : d === today ? 'today' : 'upcoming')) return false;
  }
  return true;
}

/** Where a new task goes among `items` in a list's order: on top (Manual, Newest, D85), or by due date, flag or title. */
function placeOf(items: TaskSummary[], task: TaskSummary, order: 'top' | 'due' | 'important' | 'title'): number {
  const after = (x: TaskSummary) => {
    if (order === 'due') return !task.dueDate ? false : !x.dueDate || x.dueDate > task.dueDate;
    if (order === 'important') return task.isImportant || !x.isImportant;
    if (order === 'title') return collator.compare(x.title, task.title) > 0;
    return true;
  };
  const i = items.findIndex(after);
  return i < 0 ? items.length : i;
}

const orderFor = (filter: TaskFilter, sortMode: SortMode | undefined) => {
  const sort = filter.sort ?? (filter.taskListId ? 'taskList' : 'due');
  if (sort === 'due') return 'due';
  if (sort === 'created' || !sortMode || sortMode === 'manual') return 'top';
  return sortMode === 'dueDate' ? 'due' : sortMode === 'important' ? 'important' : 'title';
};

/** One cached list with the new task in its place, `total` one more; a place past the loaded pages only counts it. */
function insertInList(data: unknown, task: TaskSummary, order: ReturnType<typeof orderFor>): unknown {
  const pages: Page[] | undefined = isPage(data) ? [data] : isPages(data) ? data.pages : undefined;
  if (!pages?.length) return data;
  const loaded = pages.reduce((n, p) => n + p.items.length, 0);
  let at = placeOf(pages.flatMap((p) => p.items), task, order);
  if (at === loaded && pages[pages.length - 1]!.nextCursor) at = -1;   // after what's loaded: its page brings it
  const next = pages.map((p, i) => {
    const page = i === 0 && p.total != null ? { ...p, total: p.total + 1 } : p;
    if (at < 0) return page;
    const here = at < p.items.length || i === pages.length - 1;
    if (!here) {
      at -= p.items.length;
      return page;
    }
    const items = [...p.items.slice(0, at), task, ...p.items.slice(at)];
    at = -1;
    return { ...page, items };
  });
  return isPage(data) ? next[0] : { ...(data as InfiniteData<Page>), pages: next };
}

/** Home's section a new task lands in: today (due or reminded today) or overdue. */
function homeSectionOf(task: TaskSummary, today: LocalDate | undefined): 'today' | 'overdue' | undefined {
  const d = task.dueDate;
  if (!today) return undefined;
  if (d === today || (task.reminder?.date === today && (!d || d > today)) || (task.kind === 'reminder' && !!task.reminder && task.reminder.date < today)) return 'today';
  if (d && d < today) return 'overdue';
  return undefined;
}

/**
 * A new task shows at once (M100): it goes into every cached list whose filter takes it (`takesNew`), in its place, Home's
 * section and totals, and its list's count. Lists it can't place (search, another person's) get it from the refetch.
 * Undo is `removeTask`: by id, so tasks added after it keep their rows.
 */
export async function insertTask(queryClient: QueryClient, task: TaskSummary, place: NewTaskPlace) {
  await queryClient.cancelQueries({ queryKey: taskKeys.views });
  eachList(queryClient, (key, data, where) => {
    let next: unknown = data;
    if (where.home && key.length === 3) {
      // Home's numbers (D107): the card or row the new task counts in goes up at once.
      const home = data as Home, c = home.counts;
      const section = homeSectionOf(task, place.today);
      next = {
        ...home,
        counts: {
          ...c,
          ...(section ? { [section]: c[section] + 1 } : {}),
          openTotal: c.openTotal + 1,
          personal: c.personal + (task.taskList?.isInbox && task.kind === 'task' ? 1 : 0),
          important: c.important + (task.isImportant && place.mine ? 1 : 0),
        },
      };
    } else if (where.home) {
      const name = key[3];
      const takes = name === 'important' ? task.isImportant && place.mine
        : name === 'inbox' ? !!task.taskList?.isInbox && task.kind === 'task'
        : (name === 'today' || name === 'overdue') && homeSectionOf(task, place.today) === name;
      if (takes) next = insertInList(data, task, 'top');
    } else if (where.filter && takesNew(where.filter, task, place)) {
      next = insertInList(data, task, orderFor(where.filter, where.filter.taskListId ? place.sortMode : undefined));
    }
    if (next !== data) queryClient.setQueryData(key, next);
  });
  const listId = task.kind === 'task' ? task.taskList?.id : undefined;   // a reminder isn't counted in Personal (D110)
  queryClient.setQueryData<TaskList[]>(taskKeys.taskLists, (lists) => lists?.map((c) => (c.id === listId ? { ...c, openTasks: (c.openTasks ?? 0) + 1 } : c)));
}

/** The task's row replaced wherever it shows: the API's answer to a create or its assignment (M100), in the same place. */
export function replaceTask(queryClient: QueryClient, saved: Task) {
  const row = toSummary(saved);
  eachList(queryClient, (key, data) => {
    if (!holds(data, row.id)) return;
    queryClient.setQueryData(key, editData(data, (p) => ({ ...p, items: p.items.map((x) => (x.id === row.id ? row : x)) })));
  });
  queryClient.setQueryData(taskKeys.detail(saved.id), saved);
}

/** A task out of every cached list (a create the API refused); counts follow with the refetch. */
export function removeTask(queryClient: QueryClient, id: Id) {
  eachList(queryClient, (key, data) => {
    if (!holds(data, id)) return;
    queryClient.setQueryData(key, editData(data, (p) => {
      const x = p.items.find((i) => i.id === id);
      return x ? editPage(p, id, 'remove', x) : p;
    }));
  });
}

/** Whether a cached list has the task in any page or Home section. */
function holds(data: unknown, id: Id): boolean {
  let found = false;
  editData(data, (p) => {
    found ||= p.items.some((x) => x.id === id);
    return p;
  });
  return found;
}
