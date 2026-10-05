import type { ReminderAt } from '@/core/dates/reminders';
import type { Task } from '@/data/tasks/types';

/** The caller's reminder as the pickers hold it: the API sends "09:00:00", the wheels use "09:00". */
export const reminderOf = (task: Task): ReminderAt | null => (task.reminder ? { date: task.reminder.date, time: task.reminder.time.slice(0, 5) } : null);
