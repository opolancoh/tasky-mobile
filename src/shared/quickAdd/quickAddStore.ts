import { create } from 'zustand';

import type { LocalDate } from '@/core/types';

/** A Quick add page it can open on instead of the form (Home's ways to start, M67). */
export type QuickAddStartPage = 'due' | 'reminder';

interface QuickAddState {
  open: boolean;
  session: number;
  title: string;
  page?: QuickAddStartPage;
  /** The due date the form starts with (Calendar's Add a task, M72). */
  dueDate?: LocalDate;
  show(title?: string, page?: QuickAddStartPage, dueDate?: LocalDate): void;
  hide(): void;
}

/**
 * Whether Quick add is open. The + in the tab bar calls `show()`; the sheet is mounted once, in App. `session` changes
 * on every `show()`, so the form starts fresh each time (it's the form's React key), with `title` filled in when given
 * and on `page` when given (its due date or reminder picker; Back or a pick returns to the form, M67), due on `dueDate` when given.
 */
export const useQuickAdd = create<QuickAddState>()((set) => ({
  open: false,
  session: 0,
  title: '',
  show: (title = '', page, dueDate) => set((s) => ({ open: true, session: s.session + 1, title, page, dueDate })),
  hide: () => set({ open: false }),
}));
