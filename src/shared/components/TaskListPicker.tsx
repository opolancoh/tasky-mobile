import { ScrollView } from 'react-native';

import type { Id } from '@/core/types';
import type { TaskList } from '@/data/tasks/types';
import { ListRow, SkeletonRow } from '@/shared/ui';

import { TaskListIcon } from './TaskListIcon';

/** Picks a task list (Quick add, task detail): Inbox first, the chosen one checked; a tap picks and goes back. Skeleton rows while `loading`. */
export function TaskListPicker({ taskLists, loading, selectedId, onPick }: { taskLists: TaskList[]; loading?: boolean; selectedId: Id | undefined; onPick(taskList: TaskList): void }) {
  if (loading) return <ScrollView>{[60, 45, 70, 50].map((w) => <SkeletonRow key={w} width={w} />)}</ScrollView>;
  return (
    <ScrollView>
      {taskLists.map((c, i) => (
        <ListRow
          key={c.id}
          label={c.name}
          icon={<TaskListIcon taskList={c} tint="ink3" />}
          selected={c.id === selectedId}
          onPress={() => onPick(c)}
          divider={i < taskLists.length - 1}
        />
      ))}
    </ScrollView>
  );
}
