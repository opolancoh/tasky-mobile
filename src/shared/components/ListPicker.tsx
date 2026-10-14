import { ScrollView } from 'react-native';

import type { Id } from '@/core/types';
import type { TaskList } from '@/data/tasks/types';
import { ListRow, SkeletonRow } from '@/shared/ui';

import { ListIcon } from './ListIcon';

/** Picks a list (Quick add, task detail): Inbox first, the chosen one checked; a tap picks and goes back. Skeleton rows while `loading`. */
export function ListPicker({ lists, loading, selectedId, onPick }: { lists: TaskList[]; loading?: boolean; selectedId: Id | undefined; onPick(list: TaskList): void }) {
  if (loading) return <ScrollView>{[60, 45, 70, 50].map((w) => <SkeletonRow key={w} width={w} />)}</ScrollView>;
  return (
    <ScrollView>
      {lists.map((c, i) => (
        <ListRow
          key={c.id}
          label={c.name}
          icon={<ListIcon list={c} tint="ink3" />}
          selected={c.id === selectedId}
          onPress={() => onPick(c)}
          divider={i < lists.length - 1}
        />
      ))}
    </ScrollView>
  );
}
