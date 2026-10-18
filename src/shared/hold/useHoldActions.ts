import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { todayIn } from '@/core/dates/localDate';
import { useCompleteTask, useHoldTask, useResumeTask } from '@/data/tasks/mutations';
import { taskKeys } from '@/data/tasks/keys';
import type { TaskList, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { toastError } from '@/shared/i18n/errors';
import { chooseAction, useToast } from '@/shared/ui';

/** The quick reasons (D91, Proposed Features #3): one tap puts a task on hold with one of them. */
export const HOLD_REASONS = ['waiting', 'decision', 'notNow'] as const;

/**
 * On hold from a row (D91, M80): **Put on hold** from a long press (only on shared and team lists), with the quick reasons
 * first, then Other reason… and Until or who resumes it… (the Hold screen); a held task's pause icon opens **Resume**,
 * **Complete**, **Edit the reason**. Resume asks first when its due date passed while it waited: keep it, or pick a new one.
 */
export function useHoldActions() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const labels = useDateLabels(today);
  const hold = useHoldTask();
  const resume = useResumeTask();
  const complete = useCompleteTask();
  const cancelLabel = t('common.cancel');
  const toast = (message: string) => useToast.getState().show({ message });

  /** Whether a task can be put on hold: in a shared or team list (read from the lists already loaded, no request). */
  const canHold = (task: Pick<TaskSummary, 'taskList' | 'status'>) => {
    if (task.status !== 'open' || !task.taskList) return false;
    const list = queryClient.getQueryData<TaskList[]>(taskKeys.taskLists)?.find((c) => c.id === task.taskList!.id);
    return !!list && !list.isInbox && list.sharing !== 'private';
  };

  const putOnHold = async (task: TaskSummary) => {
    const reasons = HOLD_REASONS.map((r) => t(`hold.reason.${r}`));
    const i = await chooseAction({
      title: t('hold.title', { title: task.title }),
      actions: [
        ...reasons.map((label) => ({ label, icon: 'pause-circle' as const })),
        { label: t('hold.other'), icon: 'edit-2' as const, more: true },
        { label: t('hold.more'), icon: 'calendar' as const, more: true },
      ],
      cancelLabel,
    });
    if (i === null) return;
    if (i < reasons.length) hold.mutate({ task, reason: reasons[i] }, { onSuccess: () => toast(t('hold.held', { title: task.title })), onError: toastError });
    else navigation.navigate('Hold', { taskId: task.id, mode: 'hold' });
  };

  const resumeTask = async (task: Pick<TaskSummary, 'id' | 'version' | 'title'> & { dueDate?: string | null }) => {
    if (task.dueDate && today && task.dueDate < today) {
      const i = await chooseAction({
        title: t('hold.duePassed', { date: labels.day(task.dueDate) }),
        actions: [{ label: t('hold.keepDate', { date: labels.day(task.dueDate) }) }, { label: t('hold.newDate'), more: true }],
        cancelLabel,
      });
      if (i === 1) navigation.navigate('Hold', { taskId: task.id, mode: 'resume' });
      if (i !== 0) return;
    }
    resume.mutate({ task }, { onSuccess: () => toast(t('hold.resumed', { title: task.title })), onError: toastError });
  };

  const heldMenu = async (task: TaskSummary) => {
    const i = await chooseAction({
      title: `${task.title} · ${t('hold.onHold')}`,
      actions: [
        { label: t('hold.resume'), icon: 'play' },
        { label: t('hold.complete'), icon: 'check-circle' },
        { label: t('hold.edit'), icon: 'edit-2' },
      ],
      cancelLabel,
    });
    if (i === 0) resumeTask(task);
    if (i === 1) complete.mutate(task);
    if (i === 2) navigation.navigate('Hold', { taskId: task.id, mode: 'hold' });
  };

  return { canHold, putOnHold, resumeTask, heldMenu, busy: hold.isPending || resume.isPending };
}
