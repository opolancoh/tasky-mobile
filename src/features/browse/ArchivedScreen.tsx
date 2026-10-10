import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useArchiveCollection } from '@/data/tasks/mutations';
import { useArchivedCollections } from '@/data/tasks/queries';
import type { Collection } from '@/data/tasks/types';
import { errorMessage } from '@/shared/i18n/errors';
import { ColorDot, Notice, Screen, SkeletonRow, Text, useTheme, useToast } from '@/shared/ui';

import { canManage } from './browseSections';

type Item = { type: 'header'; key: string } | { type: 'list'; key: string; collection: Collection } | { type: 'footer'; key: string };

/** Archived lists (M38): finished projects, out of Browse and the pickers for everyone in them. Managers unarchive. */
export function ArchivedScreen() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const archived = useArchivedCollections();
  const unarchive = useArchiveCollection();
  const lists = archived.data ?? [];
  const items: Item[] = [{ type: 'header', key: 'header' }, ...lists.map((collection) => ({ type: 'list' as const, key: collection.id, collection })), { type: 'footer', key: 'footer' }];

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            <Text variant="title" accessibilityRole="header">{t('browse.archivedList')}</Text>
            <Text variant="subhead" color="ink2">{t('browse.archivedSub')}</Text>
            {(archived.error || unarchive.error) && <View style={{ marginTop: space.md }}><Notice>{errorMessage(archived.error ?? unarchive.error)}</Notice></View>}
          </View>
        );
      case 'list': {
        const c = item.collection;
        return (
          <View style={[styles.row, { gap: space.md, borderBottomColor: colors.line }]}>
            <ColorDot color={c.color} size={12} />
            <View style={styles.fill}>
              <Text variant="body" numberOfLines={1}>{c.name}</Text>
              <Text variant="footnote" color="ink3">{t('browse.openCount', { count: c.openTasks ?? 0 })}</Text>
            </View>
            {canManage(c) && (
              <Pressable
                onPress={() => unarchive.mutate({ collection: c, archive: false }, { onSuccess: () => useToast.getState().show({ message: t('browse.unarchived', { name: c.name }) }) })}
                disabled={unarchive.isPending}
                accessibilityRole="button"
                style={styles.action}
              >
                <Text variant="label" color="accent">{t('browse.unarchive')}</Text>
              </Pressable>
            )}
          </View>
        );
      }
      case 'footer':
        return archived.isPending ? <SkeletonRow width={55} /> : !lists.length ? <Text variant="subhead" color="ink3" style={{ paddingVertical: space.lg }}>{t('browse.archivedEmpty')}</Text> : null;
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
