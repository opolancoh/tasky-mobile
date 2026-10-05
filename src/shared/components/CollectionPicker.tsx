import { ScrollView } from 'react-native';

import type { Id } from '@/core/types';
import type { Collection } from '@/data/tasks/types';
import { ListRow, SkeletonRow } from '@/shared/ui';

import { CollectionIcon } from './CollectionIcon';

/** Picks a collection (Quick add, task detail): Inbox first, the chosen one checked; a tap picks and goes back. Skeleton rows while `loading`. */
export function CollectionPicker({ collections, loading, selectedId, onPick }: { collections: Collection[]; loading?: boolean; selectedId: Id | undefined; onPick(collection: Collection): void }) {
  if (loading) return <ScrollView>{[60, 45, 70, 50].map((w) => <SkeletonRow key={w} width={w} />)}</ScrollView>;
  return (
    <ScrollView>
      {collections.map((c, i) => (
        <ListRow
          key={c.id}
          label={c.name}
          icon={<CollectionIcon collection={c} tint="ink3" />}
          selected={c.id === selectedId}
          onPress={() => onPick(c)}
          divider={i < collections.length - 1}
        />
      ))}
    </ScrollView>
  );
}
