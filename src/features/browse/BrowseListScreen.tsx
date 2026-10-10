import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { todayIn } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { useCompleteTask } from '@/data/tasks/mutations';
import { useTags, useTaskPages, useTeams } from '@/data/tasks/queries';
import type { TaskFilter, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { TaskRow } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { Notice, Screen, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { useBrowseMenus } from './browseMenus';
import { CompletedRow } from './components/CompletedRow';

/** The task lists Browse opens that aren't a collection (M38). `id`: the tag's name or the team's id. */
export type BrowseListKind = 'assigned' | 'completed' | 'tag' | 'team';

const PAGE = 20;

type Item = { type: 'header'; key: string } | { type: 'task'; key: string; task: TaskSummary } | { type: 'footer'; key: string };

/**
 * A task list from Browse (M38): Assigned to me, Completed, a tag, or a team's tasks (the count on its All tasks row).
 * Everything the user can see (D61), 20 at a time as the list scrolls (keyset). A tag has its menu in the header.
 */
export function BrowseListScreen({ route }: StaticScreenProps<{ kind: BrowseListKind; id?: string }>) {
  const { kind, id } = route.params;
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const tag = useTags().data?.find((x) => x.name === id);
  const team = useTeams().data?.find((x) => x.id === id);
  const { tagMenu } = useBrowseMenus();
  const complete = useCompleteTask();

  const filter: TaskFilter = {
    assigned: { assignee: 'me' },
    completed: { status: 'completed' as const },
    tag: { tag: id },
    team: { teamId: id as Id },
  }[kind];
  const pages = useTaskPages({ ...filter, limit: PAGE });
  const tasks = pages.data?.pages.flatMap((p) => p.items) ?? [];
  const total = pages.data?.pages[0]?.total;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: kind === 'tag' && tag
        ? () => (
            <Pressable onPress={() => tagMenu(tag, () => navigation.goBack())} accessibilityRole="button" accessibilityLabel={t('browse.menu.title')} style={styles.more}>
              <Feather name="more-horizontal" size={22} color={colors.accent} />
            </Pressable>
          )
        : undefined,
    });
  });

  const title = kind === 'tag' ? `#${id}` : kind === 'team' ? t('browse.allTasks') : t(kind === 'assigned' ? 'browse.assigned' : 'browse.completed');
  const sub = t(`browse.listSub.${kind}`);
  const items: Item[] = [{ type: 'header', key: 'header' }, ...tasks.map((task) => ({ type: 'task' as const, key: task.id, task })), { type: 'footer', key: 'footer' }];
  const open = (task: { id: Id }) => navigation.navigate('TaskDetail', { taskId: task.id });

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            {kind === 'team' && team ? <Text variant="label" color="ink3">{team.name}</Text> : null}
            <Text variant="title" accessibilityRole="header" style={kind === 'tag' && tag?.color ? { color: tag.color } : undefined}>{title}</Text>
            <Text variant="subhead" color="ink2">{total !== undefined && total !== null ? `${t(kind === 'completed' ? 'browse.taskCount' : 'browse.openCount', { count: total })} · ${sub}` : sub}</Text>
            {pages.error && (
              <View style={{ marginTop: space.md }}>
                <Notice>{errorMessage(pages.error)}</Notice>
              </View>
            )}
          </View>
        );
      case 'task':
        return kind === 'completed'
          ? <CompletedRow task={item.task} onPress={() => open(item.task)} />
          : <TaskRow task={item.task} today={today} showDue onComplete={(task) => complete.mutate(task)} onPress={open} />;
      case 'footer':
        return pages.isPending ? (
          <View>{[70, 55, 62].map((w) => <SkeletonRow key={w} width={w} />)}</View>
        ) : pages.hasNextPage ? (
          <View style={styles.footer}><ActivityIndicator color={colors.ink3} /></View>
        ) : !tasks.length ? (
          <Text variant="subhead" color="ink3" style={{ paddingVertical: space.lg }}>{t(`browse.listEmptyFor.${kind}`)}</Text>
        ) : tasks.length > PAGE ? (
          <View style={styles.footer}><Text variant="footnote" color="ink3">{t('browse.allShown', { count: tasks.length })}</Text></View>
        ) : null;
    }
  };

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => (item.type === 'task' && kind === 'completed' ? 'done' : item.type)}
        onEndReached={() => pages.hasNextPage && !pages.isFetchingNextPage && pages.fetchNextPage()}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 56 },
});
