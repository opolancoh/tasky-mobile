import { type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Id } from '@/core/types';
import { useHistory } from '@/data/tasks/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { Notice, Screen, SkeletonRow, Text, useTheme } from '@/shared/ui';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';

import { HistoryRow } from './components/HistoryRow';

/**
 * A task's history (D94, M109): Task detail's ••• › History opens it; nothing is asked for until then. Newest first, 20
 * more as it scrolls; a FlashList, so a thousand changes cost what twenty do.
 */
export function HistoryScreen({ route }: StaticScreenProps<{ taskId: Id }>) {
  const { taskId } = route.params;
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const history = useHistory(taskId);
  const refreshControl = usePullRefresh(history);
  const items = history.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <FlashList
        refreshControl={refreshControl}
        data={items}
        keyExtractor={(h) => h.id}
        renderItem={({ item }) => <HistoryRow entry={item} />}
        ListHeaderComponent={<Text variant="title" accessibilityRole="header" style={{ paddingBottom: space.md }}>{t('history.title')}</Text>}
        ListFooterComponent={
          history.isPending ? <View>{[70, 50, 60].map((w) => <SkeletonRow key={w} width={w} />)}</View>
          : history.error ? <Notice>{errorMessage(history.error)}</Notice>
          : history.hasNextPage ? <View style={styles.footer}><ActivityIndicator color={colors.ink3} /></View>
          : !items.length ? <Text variant="footnote" color="ink3">{t('history.none')}</Text>
          : null
        }
        onEndReached={() => history.hasNextPage && !history.isFetchingNextPage && history.fetchNextPage()}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
});
