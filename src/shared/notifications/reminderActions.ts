import type { QueryClient } from '@tanstack/react-query';

import { nowIn } from '@/core/dates/localDate';
import { snoozeUntil } from '@/core/dates/reminders';
import { tasksApi } from '@/data/tasks/api';
import { taskKeys } from '@/data/tasks/keys';
import { tenancyKeys } from '@/data/tenancy/keys';
import type { Me } from '@/data/tenancy/types';

import { syncReminders, type ReminderAction } from './reminders';

/**
 * A banner's action (M114), once the app is open: Done completes the task or reminder (a repeating one moves to its next
 * time, D110), the others snooze it. Then the lists refetch and the phone's notifications follow.
 */
export async function runReminderAction(action: ReminderAction, taskId: string, queryClient: QueryClient): Promise<void> {
  const me = queryClient.getQueryData<Me>(tenancyKeys.me);
  if (!me) return;
  if (action === 'done') await tasksApi.complete(await tasksApi.get(taskId));
  else await tasksApi.snooze(taskId, snoozeUntil(action, nowIn(me.timeZone)));
  await queryClient.invalidateQueries({ queryKey: taskKeys.views });
  await syncReminders(me.timeZone);
}
