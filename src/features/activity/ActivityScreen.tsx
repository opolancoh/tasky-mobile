import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { useMarkRead } from '@/data/collaboration/mutations';
import { useNotifications } from '@/data/collaboration/queries';
import type { Notification } from '@/data/collaboration/types';
import { MeButton, UpdateRow } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { Notice, Screen, SkeletonRow, Text, useTheme } from '@/shared/ui';

const PAGE = 20;

type Item =
  | { type: 'header'; key: string }
  | { type: 'section'; key: string; title: string; count?: number }
  | { type: 'update'; key: string; notification: Notification }
  | { type: 'footer'; key: string };

/**
 * Activity, the fifth tab (M39): every notification, newest first: New (unread), then Earlier. Opening one marks it read
 * and opens what it is about; Mark all read at the top. The unread count is the tab's badge. Me from the avatar.
 */
export function ActivityScreen() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const list = useNotifications(PAGE);
  const markRead = useMarkRead();
  const [refreshing, setRefreshing] = useState(false);
  const all = list.data?.pages.flatMap((p) => p.items) ?? [];
  const fresh = all.filter((n) => !n.readAt), earlier = all.filter((n) => n.readAt);

  const items: Item[] = [{ type: 'header', key: 'header' }];
  if (fresh.length) {
    items.push({ type: 'section', key: 's-new', title: t('activity.new'), count: fresh.length });
    fresh.forEach((notification) => items.push({ type: 'update', key: notification.id, notification }));
  }
  if (earlier.length) {
    items.push({ type: 'section', key: 's-earlier', title: t('activity.earlier') });
    earlier.forEach((notification) => items.push({ type: 'update', key: notification.id, notification }));
  }
  items.push({ type: 'footer', key: 'footer' });

  const refresh = async () => {
    setRefreshing(true);
    await list.refetch();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.sm }}>
            <View style={[styles.bar, { gap: space.md }]}>
              {fresh.length > 0 && (
                <Pressable onPress={() => markRead.mutate('all')} hitSlop={8} accessibilityRole="button" style={styles.barButton}>
                  <Text variant="button" color="accent">{t('activity.markAllRead')}</Text>
                </Pressable>
              )}
              <MeButton />
            </View>
            <Text variant="largeTitle" accessibilityRole="header">{t('activity.title')}</Text>
            <Text variant="subhead" color="ink2" style={{ marginTop: space.xxs }}>{t('activity.sub')}</Text>
            {list.error && <View style={{ marginTop: space.md }}><Notice>{errorMessage(list.error)}</Notice></View>}
          </View>
        );
      case 'section':
        return (
          <View style={[styles.section, { gap: space.sm, marginTop: space.lg }]}>
            <Text variant="label" color="ink2" accessibilityRole="header">{item.title}</Text>
            {item.count !== undefined && <Text variant="label" color="ink3">{item.count}</Text>}
          </View>
        );
      case 'update':
        return <UpdateRow notification={item.notification} />;
      case 'footer':
        return list.isPending ? <View>{[70, 55, 62].map((w) => <SkeletonRow key={w} width={w} />)}</View>
          : list.hasNextPage ? <View style={styles.footer}><ActivityIndicator color={colors.ink3} /></View>
          : !all.length ? (
            <View style={{ paddingVertical: space.xl, gap: space.xs }}>
              <Text variant="bodyMedium">{t('activity.empty')}</Text>
              <Text variant="footnote" color="ink3">{t('activity.emptyBody')}</Text>
            </View>
          ) : null;
    }
  };

  return (
    <Screen edges={['top']} contentStyle={styles.fill}>
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink3} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', minHeight: 44 },
  barButton: { minHeight: 44, justifyContent: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 56 },
});
