import { create } from 'zustand';

export type TaskField = 'collection' | 'due' | 'reminder' | 'repeat' | 'tags';

/**
 * Which field's sheet is open over Task detail (it edits the draft in `taskDraftStore`). The sheet is mounted once, in App (sheets are overlays at the
 * app root, docs/performance.md); `session` changes on every `show()`, so each opening starts from the task.
 */
export const useTaskSheet = create<{ open: boolean; field: TaskField; session: number; show(field: TaskField): void; hide(): void }>()((set) => ({
  open: false,
  field: 'due',
  session: 0,
  show: (field) => set((s) => ({ open: true, field, session: s.session + 1 })),
  hide: () => set({ open: false }),
}));
