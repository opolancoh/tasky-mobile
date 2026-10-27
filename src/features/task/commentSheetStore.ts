import { create } from 'zustand';

import type { Id } from '@/core/types';
import type { Comment, UserRef } from '@/data/tasks/types';

/**
 * The comment page over Task detail (M110), mounted once in App (sheets are overlays at the app root, docs/performance.md).
 * `editing`: one of the user's comments, else a new one; `people`: who can be mentioned. `session` changes on every
 * `show()`, so each opening starts empty (or from the comment).
 */
export const useCommentSheet = create<{
  open: boolean;
  taskId: Id;
  people: UserRef[];
  editing: Comment | null;
  session: number;
  show(taskId: Id, people: UserRef[], editing?: Comment | null): void;
  hide(): void;
}>()((set) => ({
  open: false,
  taskId: '',
  people: [],
  editing: null,
  session: 0,
  show: (taskId, people, editing = null) => set((s) => ({ open: true, taskId, people, editing, session: s.session + 1 })),
  hide: () => set({ open: false }),
}));
