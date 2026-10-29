import { create } from 'zustand';

import type { Id, LocalDate } from '@/core/types';

/** What a new Quick add starts with. */
export interface QuickAddStart {
  title?: string;
  /** Opens on the Reminder page instead of the form (the +'s Reminder, M113). */
  page?: 'reminder';
  /** The due date the form starts with (Calendar's Add a task, M72). */
  dueDate?: LocalDate;
  /** The list the task goes to instead of the Inbox, with no List row to change it (a list's Add a task, M103). */
  taskListId?: Id;
  /** Called when Add is tapped: a Manual list scrolls up to its new task (M60). */
  onAdded?(): void;
}

interface QuickAddState extends QuickAddStart {
  open: boolean;
  /** The +'s menu, Task · List · Team, before the form (M113). */
  menu: boolean;
  showMenu(): void;
  hideMenu(): void;
  session: number;
  show(start?: QuickAddStart): void;
  hide(): void;
}

/**
 * Whether Quick add is open. The + in the tab bar opens its menu (`showMenu()`), whose Task calls `show()`; the sheet is mounted once, in App. `session` changes
 * on every `show()`, so the form starts fresh each time (it's the form's React key), with what `start` gives: a title,
 * the Reminder page, a due date, a list.
 */
export const useQuickAdd = create<QuickAddState>()((set) => ({
  open: false,
  menu: false,
  showMenu: () => set({ menu: true }),
  hideMenu: () => set({ menu: false }),
  session: 0,
  show: ({ title, page, dueDate, taskListId, onAdded } = {}) => set((s) => ({ open: true, menu: false, session: s.session + 1, title, page, dueDate, taskListId, onAdded })),
  hide: () => set({ open: false }),
}));
