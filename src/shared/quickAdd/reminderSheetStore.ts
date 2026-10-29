import { create } from 'zustand';

import type { Id } from '@/core/types';

interface ReminderSheetState {
  open: boolean;
  /** Changes on every `show()`: the form's React key, so it starts fresh. */
  session: number;
  /** A reminder to edit; none: a new one. */
  taskId?: Id;
  show(taskId?: Id): void;
  hide(): void;
}

/** The Reminder sheet (M114), mounted once in App: the +'s Reminder opens it empty, a reminder's row with that reminder. */
export const useReminderSheet = create<ReminderSheetState>()((set) => ({
  open: false,
  session: 0,
  show: (taskId) => set((s) => ({ open: true, session: s.session + 1, taskId })),
  hide: () => set({ open: false }),
}));
