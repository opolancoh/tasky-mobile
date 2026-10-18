import { useMutationState } from '@tanstack/react-query';
import { LayoutAnimation } from 'react-native';

import type { Id } from '@/core/types';
import { taskKeys } from '@/data/tasks/keys';
import type { TaskSummary } from '@/data/tasks/types';

/** The next layout change (a row leaving or arriving) eases instead of jumping. Native, so off the JS thread. */
export const easeNextLayout = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

/**
 * Whether a toggle on this task is on its way (M75): from the tap until the fresh lists are in. While it is, the whole row
 * takes no taps (no Task detail with a version about to change, no second toggle).
 */
export function useTaskSaving(taskId: Id | undefined) {
  return useMutationState({
    filters: { mutationKey: taskKeys.all, status: 'pending' },
    select: (m) => (m.state.variables as TaskSummary | undefined)?.id,
  }).some((id) => !!taskId && id === taskId);
}

/**
 * A task's circle (M56, M75, option A): a tap eases the list and `run` sends the toggle, which moves the task at once in
 * every cache (`moveTask`): it lands in Completed (or back) right away. `saving` from then until the fresh lists are in,
 * wherever the task shows: its circle spins and takes no taps, so states never flip faster than the server.
 */
export function useTaskCheck(task: TaskSummary, run: (task: TaskSummary) => void) {
  const saving = useTaskSaving(task.id);
  const tap = () => {
    if (saving) return;
    easeNextLayout();
    run(task);
  };
  return { saving, tap };
}
