import { create } from 'zustand';

interface QuickAddState {
  open: boolean;
  session: number;
  title: string;
  show(title?: string): void;
  hide(): void;
}

/**
 * Whether Quick add is open. The + in the tab bar calls `show()`; the sheet is mounted once, in App. `session` changes
 * on every `show()`, so the form starts fresh each time (it's the form's React key), with `title` filled in when given
 * (a first-day starter, M51).
 */
export const useQuickAdd = create<QuickAddState>()((set) => ({
  open: false,
  session: 0,
  title: '',
  show: (title = '') => set((s) => ({ open: true, session: s.session + 1, title })),
  hide: () => set({ open: false }),
}));
