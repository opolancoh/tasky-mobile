import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { todayIn } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { useCompleteTask } from '@/data/tasks/mutations';
import { useTaskLists, useMembers, useTasks, useTaskPages } from '@/data/tasks/queries';
import type { TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { TaskRow } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { useQuickAdd } from '@/shared/quickAdd/quickAddStore';
import { ColorDot, Notice, radius, Screen, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { useBrowseMenus } from './browseMenus';
import { CompletedRow } from './components/CompletedRow';

type Item =
  | { type: 'header'; key: string }
  | { type: 'task'; key: string; task: TaskSummary }
  | { type: 'empty'; key: string }
  | { type: 'doneHead'; key: string }
  | { type: 'done'; key: string; task: TaskSummary }
  | { type: 'skeleton'; key: string; width: number };

/**
 * A list (M38), pushed from Browse or a team: its open tasks in its own sort mode. **Add a task** floats at the bottom,
 * empty list or full (M55): it opens Quick add for this list, which stays open for the next task. **Show completed**
 * after the open tasks only when the list has some (`completedTasks`); they load when asked, newest first, paged (D54). Under the title a line says who is in it (M44): "Shared with Luis", "Family · 3 people", or
 * "Share…" on a private list ("Only you · Ana and Luis have tasks" once tasks went to people outside it, D70, M45); a tap
 * opens People. The header holds •••, the list's menu by role.
 */
export function TaskListScreen({ route }: StaticScreenProps<{ taskListId: Id }>) {
  const { taskListId } = route.params;
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const taskList = useTaskLists().data?.find((c) => c.id === taskListId);
  const tasks = useTasks({ taskListId, sort: 'taskList' });
  const [showDone, setShowDone] = useState(false);
  const done = useTaskPages({ taskListId, status: 'completed', limit: 20 }, showDone);
  const shared = !!taskList && taskList.sharing !== 'private';
  const members = useMembers({ kind: 'taskList', id: taskListId }, shared);
  const complete = useCompleteTask();
  const { listMenu } = useBrowseMenus();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: taskList
        ? () => (
            <View style={styles.headerRight}>
              <Pressable onPress={() => listMenu(taskList, () => navigation.goBack())} accessibilityRole="button" accessibilityLabel={t('browse.menu.title')} style={styles.more}>
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
  const hasDone = showDone || (taskList?.completedTasks ?? 0) > 0;
  if (!tasks.isPending && hasDone) {
    items.push({ type: 'doneHead', key: 'doneHead' });
    if (showDone) (done.data?.pages.flatMap((p) => p.items) ?? []).forEach((task) => items.push({ type: 'done', key: `d-${task.id}`, task }));
  }
  const doneTotal = done.data?.pages[0]?.total;
  const people = members.data ?? [];
  const others = people.filter((m) => m.userId !== me?.id).map((m) => m.displayName.split(' ')[0]);
  const count = t('browse.people', { count: people.length });
  // People with tasks here who aren't in it (D70): named on a private list's line.
  const outsiders = [...new Set(rows.filter((r) => r.assignee && r.assignee.id !== me?.id && !people.some((m) => m.userId === r.assignee?.id)).map((r) => r.assignee!.displayName.split(' ')[0]))];
  // Who is in it (M44): nothing on the Inbox; "Share…" on a private list (only its owner sees it).
  const who = !taskList || taskList.isInbox ? null
    : !shared ? (outsiders.length ? t('browse.onlyYouWith', { names: outsiders.join(', ') }) : t('browse.share'))
    : !members.data ? null
    : taskList.team ? `${taskList.team.name} · ${count}`
    : taskList.owner.id === me?.id ? t('browse.sharedWith', { names: others.join(', ') })
    : `${t('browse.ownersList', { name: taskList.owner.displayName.split(' ')[0] })} · ${count}`;
  const eyebrow = !taskList || taskList.isInbox ? '' : taskList.team ? taskList.team.name : taskList.owner.id !== me?.id ? t('browse.ownersList', { name: taskList.owner.displayName.split(' ')[0] }) : '';

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            {eyebrow ? <Text variant="label" color="ink3">{eyebrow}</Text> : null}
            <View style={[styles.title, { gap: space.sm }]}>
              {taskList?.isInbox ? <Feather name="inbox" size={22} color={colors.accent} /> : <ColorDot color={taskList?.color} size={14} />}
              <Text variant="title" accessibilityRole="header" numberOfLines={2} style={styles.fill}>{taskList ? (taskList.isInbox ? t('browse.inbox') : taskList.name) : ''}</Text>
            </View>
            {taskList && (
              <Text variant="subhead" color="ink2">
                {`${t('browse.openCount', { count: tasks.data?.total ?? rows.length })} · ${t(`browse.sort.${taskList.sortMode}`)}`}
              </Text>
            )}
            {who && (
              <Pressable onPress={() => navigation.navigate('People', { kind: 'taskList', id: taskListId })} accessibilityRole="button" style={[styles.who, { gap: space.xs }]}>
                <Feather name="users" size={15} color={colors.accent} />
                <Text variant="subhead" color="accent" numberOfLines={1} style={styles.shrink}>{who}</Text>
                <Feather name="chevron-right" size={14} color={colors.accent} />
              </Pressable>
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
            <Text variant="bodyMedium">{t((taskList?.completedTasks ?? 0) > 0 ? 'browse.listAllDone' : 'browse.listEmpty')}</Text>
            <Text variant="footnote" color="ink3">{t('browse.listEmptyBody')}</Text>
          </View>
        );
      case 'doneHead':
        return showDone ? (
          <View style={[styles.doneHead, { gap: space.sm, marginTop: space.lg }]}>
            <Text variant="label" color="ink2">{doneTotal !== undefined && doneTotal !== null ? `${t('browse.completed')} · ${doneTotal}` : t('browse.completed')}</Text>
            <View style={styles.fill} />
            <Pressable onPress={() => setShowDone(false)} accessibilityRole="button" hitSlop={8} style={styles.doneAction}>
              <Text variant="subhead" color="accent">{t('browse.hideCompleted')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setShowDone(true)} accessibilityRole="button" style={[styles.showDone, { marginTop: space.lg }]}>
            <Text variant="label" color="accent">{t('browse.showCompleted')}</Text>
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
        contentContainerStyle={{ paddingBottom: ADD_HEIGHT + space.huge }}
      />
      <AddTask taskListId={taskListId} />
    </Screen>
  );
}

const ADD_HEIGHT = 48;

/** The floating Add a task (M55): opens Quick add for this list, the List row hidden and the keyboard up. */
function AddTask({ taskListId }: { taskListId: Id }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  return (
    <Pressable
      onPress={() => useQuickAdd.getState().show('', taskListId)}
      accessibilityRole="button"
      accessibilityLabel={t('quickAdd.placeholder')}
      style={({ pressed }) => [
        styles.add,
        { left: space.lg, right: space.lg, bottom: space.sm, gap: space.sm, paddingHorizontal: space.sm, backgroundColor: pressed ? colors.surface2 : colors.surface, shadowColor: colors.heading },
      ]}
    >
      <View style={[styles.addPlus, { backgroundColor: colors.accentSoft }]}>
        <Feather name="plus" size={16} color={colors.accent} />
      </View>
      <Text variant="body" color="ink3">{t('quickAdd.placeholder')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  title: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  who: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44 },
  shrink: { flexShrink: 1 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  empty: { alignItems: 'center' },
  doneHead: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  doneAction: { minHeight: 44, justifyContent: 'center' },
  showDone: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  add: {
    position: 'absolute',
    height: ADD_HEIGHT,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addPlus: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
