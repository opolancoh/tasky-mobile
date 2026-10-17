import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { todayIn } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { useCompleteTask } from '@/data/tasks/mutations';
import { useTags, useTaskLists, useTaskPages, useTeams } from '@/data/tasks/queries';
import type { TaskFilter, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { Avatar, TaskRow } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { ColorDot, Notice, Screen, Segmented, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { useAssignedByGroup, type AssignedByGroup } from './assignedByGroupStore';
import { useBrowseMenus } from './browseMenus';
import { CompletedRow } from './components/CompletedRow';

/** The task lists Spaces opens that aren't a task list (M38, M70). `id`: the tag's name or the team's id. */
export type BrowseListKind = 'all' | 'important' | 'assigned' | 'assignedBy' | 'completed' | 'tag' | 'team';

/** All tasks and Important (M70): soonest first (sort=due), grouped by list on the device, or newest first (sort=created). */
type Order = 'due' | 'list' | 'created';
const ORDERS: Order[] = ['due', 'list', 'created'];
const GROUPS: AssignedByGroup[] = ['person', 'status'];

/** Assigned by me's status groups (M71): what needs the user first. */
type StatusGroup = 'needsYou' | 'pending' | 'accepted';
const statusGroup = (task: TaskSummary): StatusGroup =>
  task.awaitsConfirmation || task.assignmentStatus === 'declined' ? 'needsYou' : task.assignmentStatus === 'pending' ? 'pending' : 'accepted';
const needsYou = (task: TaskSummary) => statusGroup(task) === 'needsYou';

const PAGE = 20;

type Item =
  | { type: 'header'; key: string }
  | { type: 'group'; key: string; name: string; color: string; count: number }
  | { type: 'person'; key: string; id: Id; name: string; count: number }
  | { type: 'task'; key: string; task: TaskSummary }
  | { type: 'footer'; key: string };

/**
 * A task list from Spaces (M38, M70): All tasks, Important, Assigned to me, Completed, a tag, or a team's tasks (the count
 * on its All tasks row), or Assigned by me (M71). Everything the user can see (D61), 20 at a time as the list scrolls (keyset).
 * A tag has its menu in the header. All tasks and Important choose their order; By list loads every page, then groups in
 * the user's list order. Assigned by me loads every page too and groups by person or by status (kept on the device).
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
  const ordered = kind === 'all' || kind === 'important';
  const [order, setOrder] = useState<Order>('due');
  const byList = ordered && order === 'list';
  const userId = me?.id ?? '';
  const group = useAssignedByGroup((s) => s.byUser[userId] ?? 'person');
  const setGroup = useAssignedByGroup((s) => s.set);
  const given = kind === 'assignedBy';
  const whole = byList || given;   // groups need every page
  const taskLists = useTaskLists();

  const sort: TaskFilter['sort'] = order === 'created' ? 'created' : 'due';
  const filter: TaskFilter = {
    all: { sort },
    important: { important: true, mine: true, sort },   // the user's own, as on Home (D61)
    assigned: { assignee: 'me' },
    assignedBy: { assignedBy: 'me' as const },
    completed: { status: 'completed' as const },
    tag: { tag: id },
    team: { teamId: id as Id },
  }[kind];
  const pages = useTaskPages({ ...filter, limit: PAGE });
  const tasks = pages.data?.pages.flatMap((p) => p.items) ?? [];
  const total = pages.data?.pages[0]?.total;

  // By list and Assigned by me group everything, so they load the rest of the pages first.
  useEffect(() => {
    if (whole && pages.hasNextPage && !pages.isFetchingNextPage) pages.fetchNextPage();
  }, [whole, pages]);

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

  const title = kind === 'tag' ? `#${id}` : kind === 'team' || kind === 'all' ? t('browse.allTasks') : t(`browse.${kind}`);
  const sub = t(`browse.listSub.${kind}`);
  const items: Item[] = [{ type: 'header', key: 'header' }];
  if (byList && !pages.hasNextPage) {
    // In the user's list order (GET /task-lists); a list they can't open (an assigned task elsewhere) goes last.
    const rank = new Map((taskLists.data ?? []).map((c, i) => [c.id, i]));
    const groups = new Map<string, TaskSummary[]>();
    tasks.forEach((task) => { const k = task.taskList?.id ?? ''; groups.set(k, [...(groups.get(k) ?? []), task]); });
    [...groups.entries()]
      .sort(([a], [b]) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity))
      .forEach(([k, ts]) => {
        const ref = ts[0].taskList;
        items.push({ type: 'group', key: `g-${k}`, name: ref?.isInbox ? t('browse.inbox') : (ref?.name ?? ''), color: ref?.color ?? colors.ink3, count: ts.length });
        ts.forEach((task) => items.push({ type: 'task', key: task.id, task }));
      });
  } else if (given && !pages.hasNextPage) {
    // Declined and completed-to-confirm first in each group, then soonest (the API's order).
    const first = (ts: TaskSummary[]) => [...ts].sort((a, b) => Number(needsYou(b)) - Number(needsYou(a)));
    if (group === 'person') {
      const people = new Map<Id, TaskSummary[]>();
      tasks.forEach((task) => task.assignee && people.set(task.assignee.id, [...(people.get(task.assignee.id) ?? []), task]));
      [...people.values()].sort((a, b) => b.length - a.length).forEach((ts) => {
        const who = ts[0].assignee!;
        items.push({ type: 'person', key: `p-${who.id}`, id: who.id, name: who.displayName, count: ts.length });
        first(ts).forEach((task) => items.push({ type: 'task', key: task.id, task }));
      });
    } else {
      (['needsYou', 'pending', 'accepted'] as const).forEach((g) => {
        const ts = tasks.filter((task) => statusGroup(task) === g);
        if (!ts.length) return;
        items.push({ type: 'group', key: `s-${g}`, name: t(`browse.assignedByGroup.${g}`), color: '', count: ts.length });
        ts.forEach((task) => items.push({ type: 'task', key: task.id, task }));
      });
    }
  } else if (!whole) tasks.forEach((task) => items.push({ type: 'task', key: task.id, task }));
  items.push({ type: 'footer', key: 'footer' });
  const open = (task: { id: Id }) => navigation.navigate('TaskDetail', { taskId: task.id });

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            {kind === 'team' && team ? <Text variant="label" color="ink3">{team.name}</Text> : null}
            <Text variant="title" accessibilityRole="header" style={kind === 'tag' && tag?.color ? { color: tag.color } : undefined}>{title}</Text>
            <Text variant="subhead" color="ink2">{total !== undefined && total !== null ? `${t(kind === 'completed' ? 'browse.taskCount' : 'browse.openCount', { count: total })} · ${sub}` : sub}</Text>
            {ordered && (
              <View style={{ marginTop: space.md }}>
                <Segmented<Order> options={ORDERS.map((o) => ({ value: o, label: t(`browse.order.${o}`) }))} value={order} onChange={setOrder} accessibilityLabel={t('browse.order.label')} />
              </View>
            )}
            {given && !!tasks.length && (
              <View style={{ marginTop: space.md }}>
                <Segmented<AssignedByGroup> options={GROUPS.map((g) => ({ value: g, label: t(`browse.assignedByGroup.${g}`) }))} value={group} onChange={(g) => setGroup(userId, g)} accessibilityLabel={t('browse.assignedByGroup.label')} />
              </View>
            )}
            {pages.error && (
              <View style={{ marginTop: space.md }}>
                <Notice>{errorMessage(pages.error)}</Notice>
              </View>
            )}
          </View>
        );
      case 'group':
        return (
          <View style={[styles.group, { gap: space.sm, marginTop: space.lg }]}>
            {!!item.color && <ColorDot color={item.color} size={8} />}
            <Text variant="label" color="ink2" accessibilityRole="header">{item.name}</Text>
            <Text variant="label" color="ink3">{item.count}</Text>
          </View>
        );
      case 'person':
        return (
          <View style={[styles.group, { gap: space.sm, marginTop: space.lg }]}>
            <Avatar name={item.name} seed={item.id} size={22} />
            <Text variant="label" color="ink2" accessibilityRole="header">{item.name}</Text>
            <Text variant="label" color="ink3">{item.count}</Text>
          </View>
        );
      case 'task':
        return kind === 'completed'
          ? <CompletedRow task={item.task} onPress={() => open(item.task)} />
          : <TaskRow task={item.task} today={today} showDue showList={!byList} showAssignment={given} hideFace={given && group === 'person'} onComplete={(task) => complete.mutate(task)} onPress={open} />;
      case 'footer':
        return pages.isPending || (whole && pages.hasNextPage) ? (
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
  group: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 56 },
});
