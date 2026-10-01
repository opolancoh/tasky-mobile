import { create } from 'zustand';

/**
 * Whether Quick add is open. The + in the tab bar calls `show()`; the sheet is mounted once, in App.
 * `session` changes on every `show()`, so the form starts empty each time (it's the form's React key).
 */
export const useQuickAdd = create<{ open: boolean; session: number; show(): void; hide(): void }>()((set) => ({
  open: false,
  session: 0,
  show: () => set((s) => ({ open: true, session: s.session + 1 })),
  hide: () => set({ open: false }),
}));
