import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { create } from 'zustand';

import type { Id } from '@/core/types';
import type { TaskSummary } from '@/data/tasks/types';

/** What a batch does, for "Moving 7 of 23" (M81). */
export type BulkVerb = 'complete' | 'date' | 'assign' | 'move' | 'flag' | 'hold' | 'delete';

/** The selection bar's pickers (M81): one sheet at the app root, over the list. */
export type BulkSheetPage = 'date' | 'assign' | 'move';

interface SelectionState {
  /** The screen selecting (its route key), or null: rows elsewhere never show the checks. */
  scope: string | null;
  /** The tasks picked, by id, as their rows showed them. */
  picked: Record<Id, TaskSummary>;
  /** A batch over 10 tasks on its way (M81): the bar shows it instead of its actions. */
  progress: { verb: BulkVerb; done: number; total: number } | null;
  /** A batch on its way, any size: the bar takes no taps. */
  running: boolean;
  sheet: BulkSheetPage | null;
  start(scope: string, task?: TaskSummary): void;
  toggle(task: TaskSummary): void;
  /** Exactly these picked: All, None, or the failed ones after a batch. */
  setPicked(tasks: TaskSummary[]): void;
  end(): void;
}

/**
 * Bulk actions (M81): which tasks are selected, in which screen. App-wide UI state, read through selectors (M13).
 * `useSelectionScope` starts and ends it for a screen; rows read `useRowSelection`.
 */
export const useSelection = create<SelectionState>()((set) => ({
  scope: null,
  picked: {},
  progress: null,
  running: false,
  sheet: null,
  start: (scope, task) => set({ scope, picked: task ? { [task.id]: task } : {}, sheet: null }),
  toggle: (task) =>
    set((s) => {
      const picked = { ...s.picked };
      if (picked[task.id]) delete picked[task.id];
      else picked[task.id] = task;
      return { picked };
    }),
  setPicked: (tasks) => set({ picked: Object.fromEntries(tasks.map((x) => [x.id, x])) }),
  end: () => set({ scope: null, picked: {}, sheet: null }),
}));

/** Open and on-hold tasks can be selected (M81); completed ones, and those waiting for the user's Confirm, can't. */
export const selectable = (task: TaskSummary) => (task.status === 'open' || task.status === 'onHold') && !task.awaitsConfirmation;

/** The picked tasks, as an array (outside render: the bar's actions). */
export const pickedTasks = () => Object.values(useSelection.getState().picked);

/**
 * A screen that selects (M81): whether it is selecting now, and `start` (a long press, ••• › Select tasks). Leaving the
 * screen ends it; so does Android's back.
 */
export function useSelectionScope() {
  const key = useRoute().key;
  const navigation = useNavigation();
  const selecting = useSelection((s) => s.scope === key);
  useEffect(() => {
    const end = () => useSelection.getState().scope === key && useSelection.getState().end();
    const off = navigation.addListener('blur', end);
    return () => {
      off();
      end();
    };
  }, [navigation, key]);
  useEffect(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      useSelection.getState().end();
      return true;
    });
    return () => sub.remove();
  }, [selecting]);
  return { key, selecting, start: (task?: TaskSummary) => useSelection.getState().start(key, task) };
}

/** A row in a screen that selects: whether its screen is selecting, and whether this task is picked. */
export function useRowSelection(taskId: Id) {
  const key = useRoute().key;
  const selecting = useSelection((s) => s.scope === key);
  const picked = useSelection((s) => s.scope === key && !!s.picked[taskId]);
  return { key, selecting, picked };
}
