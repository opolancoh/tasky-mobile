import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { useTheme } from '@/shared/ui';

type Refetchable = { isEnabled?: boolean; refetch(): Promise<unknown> };

/** Pull to refresh on every list screen: refetches the screen's queries, skipping those not enabled (a folded Completed). */
export function usePullRefresh(...queries: Refetchable[]) {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all(queries.filter((q) => q.isEnabled !== false).map((q) => q.refetch()));
    setRefreshing(false);
  };
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink3} />;
}
