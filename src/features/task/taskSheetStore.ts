import { create } from 'zustand';

import type { Id } from '@/core/types';

export type TaskField = 'collection' | 'due' | 'reminder' | 'repeat' | 'tags';

/**
 * Which field's sheet is open over Task detail. The sheet is mounted once, in App (sheets are overlays at the
 * app root, docs/performance.md); `session` changes on every `show()`, so each opening starts from the task.
 */
export const useTaskSheet = create<{ open: boolean; taskId: Id | null; field: TaskField; session: number; show(taskId: Id, field: TaskField): void; hide(): void }>()((set) => ({
  open: false,
  taskId: null,
  field: 'due',
  session: 0,
  show: (taskId, field) => set((s) => ({ open: true, taskId, field, session: s.session + 1 })),
  hide: () => set({ open: false }),
}));
