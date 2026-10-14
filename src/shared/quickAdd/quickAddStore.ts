import { create } from 'zustand';

import type { Id } from '@/core/types';

interface QuickAddState {
  open: boolean;
  session: number;
  title: string;
  /** Set when opened from a list's Add a task: the task goes there, the List row hides and the form stays open after Add. */
  taskListId: Id | null;
  show(title?: string, taskListId?: Id): void;
  hide(): void;
}

/**
 * Whether Quick add is open. The + in the tab bar calls `show()`, a list's Add a task `show('', listId)`; the sheet
 * is mounted once, in App. `session` changes on every `show()`, so the form starts fresh each time (it's the form's
 * React key), with `title` filled in when given (a first-day starter, M51).
 */
export const useQuickAdd = create<QuickAddState>()((set) => ({
  open: false,
  session: 0,
  title: '',
  taskListId: null,
  show: (title = '', taskListId) => set((s) => ({ open: true, session: s.session + 1, title, taskListId: taskListId ?? null })),
  hide: () => set({ open: false }),
}));
