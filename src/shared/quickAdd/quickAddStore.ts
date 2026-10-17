import { create } from 'zustand';

/** A Quick add page it can open on instead of the form (Get started's steps, M67). */
export type QuickAddStartPage = 'due' | 'reminder';

interface QuickAddState {
  open: boolean;
  session: number;
  title: string;
  page?: QuickAddStartPage;
  show(title?: string, page?: QuickAddStartPage): void;
  hide(): void;
}

/**
 * Whether Quick add is open. The + in the tab bar calls `show()`; the sheet is mounted once, in App. `session` changes
 * on every `show()`, so the form starts fresh each time (it's the form's React key), with `title` filled in when given
 * and on `page` when given (its due date or reminder picker; Back or a pick returns to the form, M67).
 */
export const useQuickAdd = create<QuickAddState>()((set) => ({
  open: false,
  session: 0,
  title: '',
  show: (title = '', page) => set((s) => ({ open: true, session: s.session + 1, title, page })),
  hide: () => set({ open: false }),
}));
