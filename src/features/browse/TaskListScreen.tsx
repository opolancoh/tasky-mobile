import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { todayIn } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { useCompleteTask, useReopenTask } from '@/data/tasks/mutations';
import { useTaskLists, useMembers, useTasks, useTaskPages, useTeams } from '@/data/tasks/queries';
import type { TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { TaskRow } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { SelectionAll, SelectionBar, SelectionCancel, SelectionTitle } from '@/shared/selection/SelectionBar';
import { selectable, useSelectionScope } from '@/shared/selection/selectionStore';
import { useSessionStore } from '@/shared/session/sessionStore';
import { ColorDot, Notice, Screen, SkeletonRow, Text, useTheme, useToast } from '@/shared/ui';

import { useBrowseMenus } from './browseMenus';
import { canInvite } from './browseSections';
import { AddTaskField } from './components/AddTaskField';
import { CompletedRow } from './components/CompletedRow';
import { useFoldedLists } from './foldedListsStore';

type Item =
  | { type: 'header'; key: string }
  | { type: 'task'; key: string; task: TaskSummary }
  | { type: 'empty'; key: string }
  | { type: 'heldHead'; key: string }
  | { type: 'held'; key: string; task: TaskSummary }
  | { type: 'doneHead'; key: string }
  | { type: 'done'; key: string; task: TaskSummary }
  | { type: 'skeleton'; key: string; width: number };

/**
 * A list (M38), pushed from Browse or a team: its open tasks in its own sort mode. A field docked at the bottom, empty
 * list or full, adds a task by its title (M62); the list and the field ride above the keyboard. The top (M64): the title,
 * then one line, "3 open · Shared with Luis" (only the count on a private list); add people beside ••• for those who
 * invite, and ••• opens the list's menu as a sheet. After the open tasks,
 * when the list has some (`completedTasks`), a **Completed** section that folds (M63): open by default, the fold kept per
 * list on the device, its tasks fetched only while open, newest first, paged (D54). Who is in it (M44): "Shared with
 * Luis", "Family · 3 people", or on a private list "Only you · Ana and Luis have tasks" once tasks went to people outside
 * it (D70, M45); a tap opens People. Tasks on hold (D91, M80) wait in their own section between the open tasks and
 * Completed, open by default and folding from its heading, loaded only when the list has some (`onHoldTasks`).
 * Selecting (M81): a long press on a task or ••• › Select tasks; the top bar becomes Cancel · "3 selected" · All, the
 * selection bar takes the add field's place, and Completed folds away meanwhile.
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
  const userId = useSessionStore((s) => s.userId);
  const folded = useFoldedLists((s) => (userId ? !!s.byUser[userId]?.[taskListId] : false));
  const doneCount = taskList?.completedTasks ?? 0;
  const showDone = doneCount > 0 && !folded;
  const heldCount = taskList?.onHoldTasks ?? 0;
  const [heldFolded, setHeldFolded] = useState(false);
  const held = useTasks({ taskListId, status: 'onHold' }, heldCount > 0);
  const done = useTaskPages({ taskListId, status: 'completed', limit: 20 }, showDone);   // nothing fetched while folded
  const shared = !!taskList && taskList.sharing !== 'private';
  const members = useMembers({ kind: 'taskList', id: taskListId }, shared);
  const complete = useCompleteTask();
  const reopen = useReopenTask();
  const toggleDone = () => userId && useFoldedLists.getState().setFolded(userId, taskListId, !folded);
  // Completing hides the task while Completed is folded, so it offers Undo (M56); open, the task shows up there.
  const completeTask = (task: TaskSummary) =>
    complete.mutate(task, {
      onSuccess: () => folded && useToast.getState().show({ message: t('browse.completedToast', { title: task.title }), action: { label: t('common.undo'), onPress: () => reopen.mutate(task) } }),
    });
  const { listMenu } = useBrowseMenus();
  const teams = useTeams().data;
  const team = taskList?.team ? teams?.find((x) => x.id === taskList.team!.id) : undefined;
  const list = useRef<FlashListRef<Item>>(null);
  const { selecting, start } = useSelectionScope();
  // Manual puts a new task on top (D85): after adding, the list scrolls up to show it (M60).
  const added = () => {
    if (taskList?.sortMode === 'manual') list.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const pickable = [...(tasks.data?.items ?? []), ...(held.data?.items ?? [])].filter(selectable);
  useLayoutEffect(() => {
    if (selecting) {
      navigation.setOptions({ headerBackVisible: false, gestureEnabled: false, headerLeft: () => <SelectionCancel />, headerTitle: () => <SelectionTitle />, headerRight: () => <SelectionAll tasks={pickable} /> });
      return;
    }
    navigation.setOptions({
      headerBackVisible: true,
      gestureEnabled: true,
      headerLeft: undefined,
      headerTitle: undefined,
      headerRight: taskList
        ? () => (
            <View style={styles.headerRight}>
              {canInvite(taskList, team) && (
                <Pressable onPress={() => navigation.navigate('People', { kind: 'taskList', id: taskListId })} accessibilityRole="button" accessibilityLabel={t('browse.addPeople')} style={styles.more}>
                  <Feather name="user-plus" size={21} color={colors.accent} />
                </Pressable>
              )}
              <Pressable onPress={() => listMenu(taskList, () => navigation.goBack(), () => start())} accessibilityRole="button" accessibilityLabel={t('browse.menu.title')} style={styles.more}>
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
  if (!tasks.isPending && heldCount > 0) {
    items.push({ type: 'heldHead', key: 'heldHead' });
    if (!heldFolded) (held.data?.items ?? []).forEach((task) => items.push({ type: 'held', key: `h-${task.id}`, task }));
  }
  if (!tasks.isPending && doneCount > 0 && !selecting) {
    items.push({ type: 'doneHead', key: 'doneHead' });
    if (showDone && done.isPending) [62, 48].forEach((width) => items.push({ type: 'skeleton', key: `dk${width}`, width }));
    else if (showDone) (done.data?.pages.flatMap((p) => p.items) ?? []).forEach((task) => items.push({ type: 'done', key: `d-${task.id}`, task }));
  }
  const doneTotal = done.data?.pages[0]?.total ?? doneCount;
  const openTotal = tasks.data?.total ?? rows.length;
  const people = members.data ?? [];
  const others = people.filter((m) => m.userId !== me?.id).map((m) => m.displayName.split(' ')[0]);
  const count = t('browse.people', { count: people.length });
  // People with tasks here who aren't in it (D70): named on a private list's line.
  const outsideOf = (r: TaskSummary) => !!r.assignee && r.assignee.id !== me?.id && !people.some((m) => m.userId === r.assignee?.id);
  const outsiders = [...new Set(rows.filter(outsideOf).map((r) => r.assignee!.displayName.split(' ')[0]))];
  // Who is in it (M44): nothing on Personal or a private list, unless tasks went to people outside it (D70, D88).
  const who = !taskList ? null
    : !shared ? (outsiders.length ? t('browse.onlyYouWith', { names: outsiders.join(', ') }) : null)
    : !members.data ? null
    : taskList.team ? `${taskList.team.name} · ${count}`
    : taskList.owner.id === me?.id ? t('browse.sharedWith', { names: others.join(', ') })
    : `${t('browse.ownersList', { name: taskList.owner.displayName.split(' ')[0] })} · ${count}`;

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            <View style={[styles.title, { gap: space.sm }]}>
              {taskList?.isInbox ? <Feather name="inbox" size={22} color={colors.accent} /> : <ColorDot color={taskList?.color} size={14} />}
              <Text variant="title" accessibilityRole="header" numberOfLines={2} style={styles.fill}>{taskList ? (taskList.isInbox ? t('browse.inbox') : taskList.name) : ''}</Text>
            </View>
            {taskList && !tasks.isPending && (
              <View style={[styles.line, { gap: space.xs }]}>
                <Text variant="subhead" color="ink3">{openTotal ? t('browse.openShort', { count: openTotal }) : t('browse.noTasksYet')}</Text>
                {who && (
                  <Pressable onPress={() => navigation.navigate('People', { kind: 'taskList', id: taskListId })} accessibilityRole="button" style={[styles.who, { gap: space.xs }]}>
                    <Text variant="subhead" color="ink3">·</Text>
                    <Feather name="users" size={14} color={colors.ink2} />
                    <Text variant="subhead" color="ink2" numberOfLines={1} style={styles.shrink}>{who}</Text>
                  </Pressable>
                )}
              </View>
            )}
            {tasks.error && (
              <View style={{ marginTop: space.md }}>
                <Notice>{errorMessage(tasks.error)}</Notice>
              </View>
            )}
          </View>
        );
      case 'task':
        return <TaskRow task={item.task} today={today} showDue showList={false} outside={shared && !!members.data && outsideOf(item.task)} selectable onComplete={completeTask} onPress={open} />;
      case 'empty':
        return (
          <View style={[styles.empty, { gap: space.xs, paddingVertical: space.huge }]}>
            <Feather name="check-circle" size={28} color={colors.accent} />
            <Text variant="bodyMedium">{t((taskList?.completedTasks ?? 0) > 0 ? 'browse.listAllDone' : 'browse.listEmpty')}</Text>
            <Text variant="footnote" color="ink3">{t('browse.listEmptyBody')}</Text>
          </View>
        );
      case 'heldHead':
        return (
          <Pressable onPress={() => setHeldFolded((f) => !f)} accessibilityRole="button" accessibilityState={{ expanded: !heldFolded }} style={[styles.doneHead, { gap: space.xs, marginTop: space.lg }]}>
            <Feather name="chevron-right" size={16} color={colors.ink2} style={!heldFolded && styles.turned} />
            <Text variant="label" color="ink2">{t('hold.section')}</Text>
            <Text variant="label" color="ink3">{held.data?.total ?? heldCount}</Text>
          </Pressable>
        );
      case 'held':
        return <TaskRow task={item.task} today={today} showDue showList={false} selectable onComplete={completeTask} onPress={open} />;
      case 'doneHead':
        return (
          <Pressable
            onPress={toggleDone}
            accessibilityRole="button"
            accessibilityState={{ expanded: !folded }}
            style={[styles.doneHead, { gap: space.xs, marginTop: space.lg }]}
          >
            <Feather name="chevron-right" size={16} color={colors.ink2} style={!folded && styles.turned} />
            <Text variant="label" color="ink2">{t('browse.completed')}</Text>
            <Text variant="label" color="ink3">{doneTotal}</Text>
          </Pressable>
        );
      case 'done':
        return <CompletedRow task={item.task} showList={false} onPress={() => open(item.task)} />;
      case 'skeleton':
        return <SkeletonRow width={item.width} />;
    }
  };

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill} followKeyboard>
      <FlashList
        ref={list}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        onEndReached={() => showDone && done.hasNextPage && !done.isFetchingNextPage && done.fetchNextPage()}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"   // a row's circle still completes while the keyboard is up
        keyboardDismissMode="interactive"   // dragging the list closes the keyboard; the typed title stays
        contentContainerStyle={{ paddingBottom: space.lg }}
      />
      {selecting ? <SelectionBar /> : <AddTaskField taskListId={taskListId} listName={taskList ? (taskList.isInbox ? t('browse.inbox') : taskList.name) : ''} onAdded={added} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  title: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  line: { flexDirection: 'row', alignItems: 'center' },
  who: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, minHeight: 44 },
  shrink: { flexShrink: 1 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  empty: { alignItems: 'center' },
  doneHead: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44 },
  turned: { transform: [{ rotate: '90deg' }] },
});
