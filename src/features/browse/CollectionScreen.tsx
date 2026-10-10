import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { todayIn } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { useCompleteTask } from '@/data/tasks/mutations';
import { useCollections, useMembers, useTaskList, useTaskPages } from '@/data/tasks/queries';
import type { TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { TaskRow } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { ColorDot, Notice, Screen, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { useBrowseMenus } from './browseMenus';
import { CompletedRow } from './components/CompletedRow';
import { Faces } from './components/Faces';

type Item =
  | { type: 'header'; key: string }
  | { type: 'task'; key: string; task: TaskSummary }
  | { type: 'empty'; key: string }
  | { type: 'doneHead'; key: string }
  | { type: 'done'; key: string; task: TaskSummary }
  | { type: 'skeleton'; key: string; width: number };

/**
 * A list (M38), pushed from Browse or a team: its open tasks in its own sort mode, Completed folded at the end (loaded
 * when opened, D54). The header holds up to 3 faces of its people (a tap opens People; none on a private list) and •••,
 * the list's menu by role.
 */
export function CollectionScreen({ route }: StaticScreenProps<{ collectionId: Id }>) {
  const { collectionId } = route.params;
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const collection = useCollections().data?.find((c) => c.id === collectionId);
  const tasks = useTaskList({ collectionId, sort: 'collection' });
  const [showDone, setShowDone] = useState(false);
  const done = useTaskPages({ collectionId, status: 'completed', limit: 20 }, showDone);
  const shared = !!collection && collection.sharing !== 'private';
  const members = useMembers({ kind: 'collection', id: collectionId }, shared);
  const complete = useCompleteTask();
  const { listMenu } = useBrowseMenus();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: collection
        ? () => (
            <View style={styles.headerRight}>
              {shared && members.data && members.data.length > 1 && (
                <Pressable onPress={() => navigation.navigate('People', { kind: 'collection', id: collectionId })} accessibilityRole="button" accessibilityLabel={t('browse.peopleOf', { names: members.data.map((m) => m.displayName).join(', ') })} style={styles.faces}>
                  <Faces people={members.data.map((m) => ({ id: m.userId, name: m.displayName }))} />
                </Pressable>
              )}
              <Pressable onPress={() => listMenu(collection, () => navigation.goBack())} accessibilityRole="button" accessibilityLabel={t('browse.menu.title')} style={styles.more}>
                <Feather name="more-horizontal" size={22} color={colors.accent} />
              </Pressable>
            </View>
          )
        : undefined,
    });
  });

  const open = (task: { id: Id }) => navigation.navigate('TaskDetail', { taskId: task.id });
  const items: Item[] = [{ type: 'header', key: 'header' }];
  const rows = tasks.data?.items ?? [];
  if (tasks.isPending) [70, 55, 62].forEach((width) => items.push({ type: 'skeleton', key: `k${width}`, width }));
  else if (rows.length) rows.forEach((task) => items.push({ type: 'task', key: task.id, task }));
  else items.push({ type: 'empty', key: 'empty' });
  if (!tasks.isPending) {
    items.push({ type: 'doneHead', key: 'doneHead' });
    if (showDone) (done.data?.pages.flatMap((p) => p.items) ?? []).forEach((task) => items.push({ type: 'done', key: `d-${task.id}`, task }));
  }
  const doneTotal = done.data?.pages[0]?.total;
  const eyebrow = !collection || collection.isInbox ? '' : collection.team ? collection.team.name : collection.owner.id !== me?.id ? t('browse.ownersList', { name: collection.owner.displayName.split(' ')[0] }) : '';

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            {eyebrow ? <Text variant="label" color="ink3">{eyebrow}</Text> : null}
            <View style={[styles.title, { gap: space.sm }]}>
              {collection?.isInbox ? <Feather name="inbox" size={22} color={colors.accent} /> : <ColorDot color={collection?.color} size={14} />}
              <Text variant="title" accessibilityRole="header" numberOfLines={2} style={styles.fill}>{collection ? (collection.isInbox ? t('browse.inbox') : collection.name) : ''}</Text>
            </View>
            {collection && (
              <Text variant="subhead" color="ink2">
                {`${t('browse.openCount', { count: tasks.data?.total ?? rows.length })} · ${t(`browse.sort.${collection.sortMode}`)}`}
              </Text>
            )}
            {tasks.error && (
              <View style={{ marginTop: space.md }}>
                <Notice>{errorMessage(tasks.error)}</Notice>
              </View>
            )}
          </View>
        );
      case 'task':
        return <TaskRow task={item.task} today={today} showDue onComplete={(task) => complete.mutate(task)} onPress={open} />;
      case 'empty':
        return (
          <View style={[styles.empty, { gap: space.xs, paddingVertical: space.huge }]}>
            <Feather name="check-circle" size={28} color={colors.accent} />
            <Text variant="bodyMedium">{t('browse.listEmpty')}</Text>
            <Text variant="footnote" color="ink3">{t('browse.listEmptyBody')}</Text>
          </View>
        );
      case 'doneHead':
        return (
          <Pressable onPress={() => setShowDone(!showDone)} accessibilityRole="button" accessibilityState={{ expanded: showDone }} style={[styles.doneHead, { gap: space.sm, marginTop: space.lg }]}>
            <Text variant="label" color="ink2">{t('browse.completed')}</Text>
            {showDone && doneTotal !== undefined && doneTotal !== null && <Text variant="label" color="ink3">{doneTotal}</Text>}
            <View style={styles.fill} />
            <Feather name={showDone ? 'chevron-down' : 'chevron-right'} size={16} color={colors.ink3} />
          </Pressable>
        );
      case 'done':
        return <CompletedRow task={item.task} onPress={() => open(item.task)} />;
      case 'skeleton':
        return <SkeletonRow width={item.width} />;
    }
  };

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        onEndReached={() => showDone && done.hasNextPage && !done.isFetchingNextPage && done.fetchNextPage()}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: space.huge }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  title: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  faces: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  empty: { alignItems: 'center' },
  doneHead: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
});
