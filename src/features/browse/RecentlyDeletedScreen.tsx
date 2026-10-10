import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import { useRestoreItem } from '@/data/tasks/mutations';
import { useRecentlyDeleted } from '@/data/tasks/queries';
import type { DeletedItem } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { Notice, Screen, SkeletonRow, Text, useTheme, useToast } from '@/shared/ui';

type Item = { type: 'header'; key: string } | { type: 'item'; key: string; item: DeletedItem } | { type: 'footer'; key: string };

const ICON = { task: 'circle', collection: 'list', team: 'users' } as const;

/**
 * Recently Deleted (M38, D54): tasks, lists and teams the user could see, deleted in the last 30 days, newest first.
 * Restore where the API allows it (`canRestore`): a task, anyone who sees its list; a list, its managers; a team, its owner.
 */
export function RecentlyDeletedScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const me = useMe().data;
  const deleted = useRecentlyDeleted();
  const restore = useRestoreItem();
  const list = deleted.data?.items ?? [];
  const items: Item[] = [{ type: 'header', key: 'header' }, ...list.map((item) => ({ type: 'item' as const, key: `${item.kind}-${item.id}`, item })), { type: 'footer', key: 'footer' }];
  const day = (iso: string) => (me ? formatInstant(iso, i18n.language, me.timeZone, { month: 'short', day: 'numeric' }) : '');

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            <Text variant="title" accessibilityRole="header">{t('browse.recentlyDeleted')}</Text>
            <Text variant="subhead" color="ink2">{t('browse.deletedSub')}</Text>
            {(deleted.error || restore.error) && <View style={{ marginTop: space.md }}><Notice>{errorMessage(deleted.error ?? restore.error)}</Notice></View>}
          </View>
        );
      case 'item': {
        const x = item.item;
        const what = x.kind === 'collection' ? t('browse.deletedList', { count: x.taskCount ?? 0 }) : t(`browse.deletedKind.${x.kind}`);
        return (
          <View style={[styles.row, { gap: space.md, borderBottomColor: colors.line }]}>
            <Feather name={ICON[x.kind]} size={18} color={colors.ink3} />
            <View style={styles.fill}>
              <Text variant="body" numberOfLines={1}>{x.name}</Text>
              <Text variant="footnote" color="ink3" numberOfLines={1}>{t('browse.deletedLine', { what, date: day(x.deletedAt), until: day(x.restorableUntil) })}</Text>
            </View>
            {x.canRestore && (
              <Pressable onPress={() => restore.mutate(x, { onSuccess: () => useToast.getState().show({ message: t('browse.restored', { name: x.name }) }) })} disabled={restore.isPending} accessibilityRole="button" style={styles.action}>
                <Text variant="label" color="accent">{t('browse.restore')}</Text>
              </Pressable>
            )}
          </View>
        );
      }
      case 'footer':
        return deleted.isPending ? <SkeletonRow width={55} /> : !list.length ? <Text variant="subhead" color="ink3" style={{ paddingVertical: space.lg }}>{t('browse.deletedEmpty')}</Text> : null;
    }
  };

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <FlashList data={items} renderItem={renderItem} keyExtractor={(item) => item.key} getItemType={(item) => item.type} showsVerticalScrollIndicator={false} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth },
  action: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
});
