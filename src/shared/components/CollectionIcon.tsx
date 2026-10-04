import { Feather } from '@expo/vector-icons';

import type { Collection } from '@/data/tasks/types';
import { ColorDot, useTheme } from '@/shared/ui';

/** A collection's mark in rows and pickers: the Inbox tray, or the collection's color dot. */
export function CollectionIcon({ collection, tint = 'accent' }: { collection: Collection | undefined; tint?: 'accent' | 'ink3' }) {
  const { colors } = useTheme();
  return collection?.isInbox ? <Feather name="inbox" size={20} color={colors[tint]} /> : <ColorDot color={collection?.color} />;
}
