import { create } from 'zustand';

import type { Id, LocalDate } from '@/core/types';

/** A Quick add page it can open on instead of the form (Home's ways to start, M67). */
export type QuickAddStartPage = 'due' | 'reminder';

/** What a new Quick add starts with. */
export interface QuickAddStart {
  title?: string;
  page?: QuickAddStartPage;
  /** The due date the form starts with (Calendar's Add a task, M72). */
  dueDate?: LocalDate;
  /** The list the task goes to instead of the Inbox, with no List row to change it (a list's Add a task, M103). */
  taskListId?: Id;
  /** Called when Add is tapped: a Manual list scrolls up to its new task (M60). */
  onAdded?(): void;
}

interface QuickAddState extends QuickAddStart {
  open: boolean;
  session: number;
  show(start?: QuickAddStart): void;
  hide(): void;
}

/**
 * Whether Quick add is open. The + in the tab bar calls `show()`; the sheet is mounted once, in App. `session` changes
 * on every `show()`, so the form starts fresh each time (it's the form's React key), with what `start` gives: a title,
 * a page (its due date or reminder picker; Back or a pick returns to the form, M67), a due date, a list.
 */
export const useQuickAdd = create<QuickAddState>()((set) => ({
  open: false,
  session: 0,
  show: ({ title, page, dueDate, taskListId, onAdded } = {}) => set((s) => ({ open: true, session: s.session + 1, title, page, dueDate, taskListId, onAdded })),
  hide: () => set({ open: false }),
}));
