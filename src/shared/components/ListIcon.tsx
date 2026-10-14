import { Feather } from '@expo/vector-icons';

import type { TaskList } from '@/data/tasks/types';
import { ColorDot, useTheme } from '@/shared/ui';

/** A list's mark in rows and pickers: the Inbox tray, or the list's color dot. */
export function ListIcon({ list, tint = 'accent' }: { list: Pick<TaskList, 'isInbox' | 'color'> | undefined; tint?: 'accent' | 'ink3' }) {
  const { colors } = useTheme();
  return list?.isInbox ? <Feather name="inbox" size={20} color={colors[tint]} /> : <ColorDot color={list?.color} />;
}
