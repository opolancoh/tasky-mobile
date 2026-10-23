import { useMutationState } from '@tanstack/react-query';
import { LayoutAnimation } from 'react-native';

import type { Id } from '@/core/types';
import { taskKeys } from '@/data/tasks/keys';
import type { TaskSummary } from '@/data/tasks/types';
import { useDelayedFlag } from '@/shared/ui';

/** The next layout change (a row leaving or arriving) eases instead of jumping. Native, so off the JS thread. */
export const easeNextLayout = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

/**
 * Whether a toggle on this task is on its way (M75), from the tap until the fresh lists are in, or the task itself, from
 * Add until the API has it and its assignee (M100). While it is, the whole row takes no taps (no Task detail with a
 * version about to change, no second toggle). Every task mutation's variables carry the task's `id`.
 */
export function useTaskSaving(taskId: Id | undefined) {
  return useMutationState({
    filters: { mutationKey: taskKeys.all, status: 'pending' },
    select: (m) => (m.state.variables as { id?: Id } | undefined)?.id,
  }).some((id) => !!taskId && id === taskId);
}

/** Whether this task is still being added (M100): its circle spins only after 300 ms (M56), so a fast answer shows none. */
function useTaskAdding(taskId: Id) {
  return useMutationState({
    filters: { mutationKey: taskKeys.creating, status: 'pending' },
    select: (m) => (m.state.variables as { id?: Id } | undefined)?.id,
  }).includes(taskId);
}

/**
 * A task's circle (M56, M75, option A): a tap eases the list and `run` sends the toggle, which moves the task at once in
 * every cache (`moveTask`): it lands in Completed (or back) right away. `saving` from then until the fresh lists are in,
 * wherever the task shows: its circle spins (`spinning`) and the row takes no taps (`saving`), so states never flip faster
 * than the server.
 */
export function useTaskCheck(task: TaskSummary, run: (task: TaskSummary) => void) {
  const saving = useTaskSaving(task.id);
  const adding = useTaskAdding(task.id);
  const late = useDelayedFlag(adding);
  const tap = () => {
    if (saving) return;
    easeNextLayout();
    run(task);
  };
  /** The circle's spinner: at once for a toggle (M75), after 300 ms for a task being added. */
  const spinning = saving && (!adding || late);
  return { saving, spinning, tap };
}
