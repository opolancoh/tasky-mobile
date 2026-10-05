import { create } from 'zustand';

import type { Id } from '@/core/types';
import type { Task } from '@/data/tasks/types';

import { changedKeys, rebase, toDraft, type TaskDraft } from './taskDraft';

interface DraftState {
  taskId: Id | null;
  /** The version the edits started from: Save's If-Match. */
  version: number;
  base: TaskDraft | null;
  draft: TaskDraft | null;
  /** The task as read. Keeps unsaved edits of the same task; otherwise starts over from it. */
  load(task: Task): void;
  edit(changes: Partial<TaskDraft>): void;
  /** After a 412: the latest task with the edits on top. */
  rebase(task: Task): void;
  clear(): void;
}

/**
 * Task detail's draft (M26): what the person changed, saved with Save. A store, so a keystroke in the title or a step
 * redraws only that field and the Save button (each reads its own slice; docs/performance.md, rules 2 and 7).
 */
export const useTaskDraft = create<DraftState>()((set, get) => ({
  taskId: null,
  version: 0,
  base: null,
  draft: null,
  load: (task) => {
    const s = get();
    if (s.taskId === task.id && s.base && s.draft && changedKeys(s.base, s.draft).length) return;
    const draft = toDraft(task);
    set({ taskId: task.id, version: task.version, base: draft, draft });
  },
  edit: (changes) => set((s) => (s.draft ? { draft: { ...s.draft, ...changes } } : {})),
  rebase: (task) =>
    set((s) => (s.base && s.draft ? { version: task.version, base: toDraft(task), draft: rebase(task, s.base, s.draft) } : {})),
  clear: () => set({ taskId: null, base: null, draft: null }),
}));

/** Whether there is something to save. */
export const useDirty = () => useTaskDraft((s) => !!s.base && !!s.draft && changedKeys(s.base, s.draft).length > 0);
