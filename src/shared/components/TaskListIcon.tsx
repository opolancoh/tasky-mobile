import { Feather } from '@expo/vector-icons';

import type { TaskList } from '@/data/tasks/types';
import { ColorDot, useTheme } from '@/shared/ui';

/** A task list's mark in rows and pickers: the Inbox tray, or the task list's color dot. */
export function TaskListIcon({ taskList, tint = 'accent' }: { taskList: Pick<TaskList, 'isInbox' | 'color'> | undefined; tint?: 'accent' | 'ink3' }) {
  const { colors } = useTheme();
  return taskList?.isInbox ? <Feather name="inbox" size={20} color={colors[tint]} /> : <ColorDot color={taskList?.color} />;
}
