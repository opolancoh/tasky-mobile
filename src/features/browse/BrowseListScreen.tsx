import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { weekStart } from '@/core/dates/calendar';
import { addDays, todayIn } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { useCompleteTask } from '@/data/tasks/mutations';
import { useTags, useTaskLists, useTaskPages, useTeams } from '@/data/tasks/queries';
import type { TaskFilter, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { Avatar, TaskRow } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { chooseAction, ColorDot, Notice, Screen, Segmented, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { defaultGroup, useAllTasksGroup, type AllTasksGroup } from './allTasksGroupStore';
import { useAssignedByGroup, type AssignedByGroup } from './assignedByGroupStore';
import { useBrowseMenus } from './browseMenus';
import { CompletedRow } from './components/CompletedRow';
import { FilterStrip } from './components/FilterStrip';

/** The task lists Spaces opens that aren't a task list (M38, M70). `id`: the tag's name or the team's id. */
export type BrowseListKind = 'all' | 'important' | 'assigned' | 'assignedBy' | 'completed' | 'tag' | 'team';

/** Important (M70): soonest first (sort=due), grouped by list on the device, or newest first (sort=created). */
type Order = 'due' | 'list' | 'created';
/** All tasks, in Spaces and in a team (M78): grouped by Date, List or Person, and one filter at a time. */
const ALL_GROUPS: AllTasksGroup[] = ['date', 'list', 'person'];
type Show = 'mine' | 'unassigned' | 'overdue' | 'week' | 'onHold';
const SHOWS: Show[] = ['mine', 'unassigned', 'overdue', 'week', 'onHold'];
type DateGroup = 'overdue' | 'today' | 'week' | 'later' | 'none';
const ORDERS: Order[] = ['due', 'list', 'created'];
const GROUPS: AssignedByGroup[] = ['person', 'status'];

/** Assigned by me's status groups (M71): what needs the user first. */
type StatusGroup = 'needsYou' | 'onHold' | 'pending' | 'accepted';
const statusGroup = (task: TaskSummary): StatusGroup =>
  task.awaitsConfirmation || task.assignmentStatus === 'declined' ? 'needsYou' : task.status === 'onHold' ? 'onHold' : task.assignmentStatus === 'pending' ? 'pending' : 'accepted';
const needsYou = (task: TaskSummary) => statusGroup(task) === 'needsYou';

const PAGE = 20;
/** Groups that need every task (List, Person, Assigned by me) load 200 at a time, the API's largest page (M78). */
const WHOLE_PAGE = 200;

type Item =
  | { type: 'header'; key: string }
  | { type: 'group'; key: string; name: string; color: string; count?: number; danger?: boolean }
  | { type: 'person'; key: string; id: Id | null; name: string; count: number; late: number }
  | { type: 'task'; key: string; task: TaskSummary }
  | { type: 'footer'; key: string };

/**
 * A task list from Spaces (M38, M70): All tasks, Important, Assigned to me, Completed, a tag, or a team's tasks (the count
 * on its All tasks row), or Assigned by me (M71). Everything the user can see (D61), 20 at a time as the list scrolls (keyset).
 * A tag has its menu in the header. Important chooses its order; By list loads every page, then groups in the user's list
 * order. Assigned by me loads every page too and groups by person or by status (kept on the device).
 * All tasks (M78), in Spaces and in a team, is one screen: a row that scrolls with Group (Date, List, Person; Spaces opens
 * on Date, a team on Person, each kept on the device) and one filter (Mine, Unassigned, Overdue, This week), sent to the
 * API (Person: everyone else, then the user, then Not assigned). Date pages as it scrolls, its headings added as rows arrive; List and Person load every page, 200 at a time. A task
 * with nobody on it in a list only the user sees counts as theirs. Headings fold.
 */
export function BrowseListScreen({ route }: StaticScreenProps<{ kind: BrowseListKind; id?: string; person?: Id; personName?: string }>) {
  // `person`: one person's tasks in a team (M79, from People), by date, no filter row; `personName` absent for the user.
  const { kind, id, person, personName } = route.params;
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const tag = useTags().data?.find((x) => x.name === id);
  const team = useTeams().data?.find((x) => x.id === id);
  const { tagMenu } = useBrowseMenus();
  const complete = useCompleteTask();
  const ordered = kind === 'important';
  const scoped = kind === 'all' || kind === 'team';
  const scope = kind === 'team' ? (id ?? '') : 'all';
  const [order, setOrder] = useState<Order>('due');
  const byList = ordered && order === 'list';
  const userId = me?.id ?? '';
  const group = useAssignedByGroup((s) => s.byUser[userId] ?? 'person');
  const setGroup = useAssignedByGroup((s) => s.set);
  const given = kind === 'assignedBy';
  const chosen = useAllTasksGroup((s) => s.byUser[userId]?.[scope]) ?? defaultGroup(scope);
  const groupBy: AllTasksGroup = person ? 'date' : chosen;
  const setGroupBy = useAllTasksGroup((s) => s.set);
  const [show, setShow] = useState<Show | null>(null);
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const byDate = scoped && groupBy === 'date';
  const byPerson = scoped && groupBy === 'person';
  const listed = byList || (scoped && groupBy === 'list');
  const whole = listed || byPerson || given;   // groups need every page
  const taskLists = useTaskLists();
  const weekEnd = today ? addDays(weekStart(today), 6) : undefined;

  const sort: TaskFilter['sort'] = order === 'created' ? 'created' : 'due';
  const shown: TaskFilter = !scoped || !show ? {} : {
    mine: { mine: true },
    unassigned: { assignee: 'none' },
    overdue: { due: ['overdue' as const] },
    week: weekEnd ? { dueTo: weekEnd } : {},
    onHold: { status: 'onHold' as const },   // D91: the whole set, not paged
  }[show];
  const filter: TaskFilter = {
    all: { sort: 'due' as const, ...shown },
    important: { important: true, mine: true, sort },   // the user's own, as on Home (D61)
    assigned: { assignee: 'me' },
    assignedBy: { assignedBy: 'me' as const },
    completed: { status: 'completed' as const },
    tag: { tag: id },
    team: { teamId: id as Id, sort: 'due' as const, ...shown, ...(person ? { assignee: person } : {}) },
  }[kind];
  const pages = useTaskPages({ ...filter, limit: whole ? WHOLE_PAGE : PAGE });
  const lists = new Map((taskLists.data ?? []).map((c) => [c.id, c]));
  // Nobody on it, in a list only the user sees (Inbox, a private list of theirs): the task is theirs.
  const alone = (task: TaskSummary) => {
    const c = task.taskList ? lists.get(task.taskList.id) : undefined;
    return !task.assignee && (!!task.taskList?.isInbox || (!!c && c.sharing === 'private' && !c.team));
  };
  const loaded = pages.data?.pages.flatMap((p) => p.items) ?? [];
  const tasks = scoped && show === 'unassigned' ? loaded.filter((task) => !alone(task)) : loaded;
  const total = pages.data?.pages[0]?.total;
  // Unassigned leaves out on the device what only the user sees, so its count comes from what's loaded once it's whole.
  const count = scoped && show === 'unassigned' && !pages.hasNextPage ? tasks.length : total;

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

  const dateGroup = (task: TaskSummary): DateGroup =>
    !task.dueDate || !today ? 'none' : task.dueDate < today ? (task.status === 'onHold' ? 'later' : 'overdue') : task.dueDate === today ? 'today' : weekEnd && task.dueDate <= weekEnd ? 'week' : 'later';
  const meId = me?.id;
  const chooseGroup = async () => {
    const i = await chooseAction({ title: t('browse.groupBy.title'), actions: ALL_GROUPS.map((g) => ({ label: t(`browse.groupBy.${g}`), selected: g === groupBy })), cancelLabel: t('common.cancel') });
    if (i !== null && userId) setGroupBy(userId, scope, ALL_GROUPS[i]);
  };
  const fold = (key: string) => setFolded((f) => ({ ...f, [key]: !f[key] }));
  const push = (key: string, ts: TaskSummary[]) => !folded[key] && ts.forEach((task) => items.push({ type: 'task', key: task.id, task }));

  const title = person ? (personName ? t('browse.personTasks', { name: personName }) : t('browse.yourTasks')) : kind === 'tag' ? `#${id}` : kind === 'team' || kind === 'all' ? t('browse.allTasks') : t(`browse.${kind}`);
  const sub = t(`browse.listSub.${kind}`);
  const items: Item[] = [{ type: 'header', key: 'header' }];
  if (byDate) {
    // In the API's order (soonest first, no date last): a heading each time the group changes; its count once it's whole.
    const runs: [DateGroup, TaskSummary[]][] = [];
    tasks.forEach((task) => { const g = dateGroup(task); const last = runs[runs.length - 1]; if (last?.[0] === g) last[1].push(task); else runs.push([g, [task]]); });
    runs.forEach(([g, ts], i) => {
      const whole = i < runs.length - 1 || !pages.hasNextPage;
      items.push({ type: 'group', key: `d-${g}`, name: t(`browse.dateGroup.${g}`), color: '', count: whole ? ts.length : undefined, danger: g === 'overdue' });
      push(`d-${g}`, ts);
    });
  } else if (byPerson && !pages.hasNextPage) {
    // Everyone else first, most tasks first, then the user, then Not assigned.
    const groups = new Map<string, TaskSummary[]>();
    tasks.forEach((task) => { const k = task.assignee?.id ?? (alone(task) ? (meId ?? '') : ''); groups.set(k, [...(groups.get(k) ?? []), task]); });
    const rank = (k: string, n: number) => (k === '' ? 2 : k === meId ? 1 : -n / 10_000);
    [...groups.entries()].sort(([a, x], [b, y]) => rank(a, x.length) - rank(b, y.length)).forEach(([k, ts]) => {
      const name = k === '' ? t('browse.notAssigned') : k === meId ? t('browse.personYou') : (ts.find((x) => x.assignee)?.assignee?.displayName ?? '');
      items.push({ type: 'person', key: `p-${k}`, id: k || null, name, count: ts.length, late: ts.filter((x) => dateGroup(x) === 'overdue').length });
      push(`p-${k}`, ts);
    });
  } else if (listed && !pages.hasNextPage) {
    // In the user's list order (GET /task-lists); a list they can't open (an assigned task elsewhere) goes last.
    const rank = new Map((taskLists.data ?? []).map((c, i) => [c.id, i]));
    const groups = new Map<string, TaskSummary[]>();
    tasks.forEach((task) => { const k = task.taskList?.id ?? ''; groups.set(k, [...(groups.get(k) ?? []), task]); });
    [...groups.entries()]
      .sort(([a], [b]) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity))
      .forEach(([k, ts]) => {
        const ref = ts[0].taskList;
        items.push({ type: 'group', key: `g-${k}`, name: ref?.isInbox ? t('browse.inbox') : (ref?.name ?? ''), color: ref?.color ?? colors.ink3, count: ts.length });
        push(`g-${k}`, ts);
      });
  } else if (given && !pages.hasNextPage) {
    // Declined and completed-to-confirm first in each group, then soonest (the API's order).
    const first = (ts: TaskSummary[]) => [...ts].sort((a, b) => Number(needsYou(b)) - Number(needsYou(a)));
    if (group === 'person') {
      const people = new Map<Id, TaskSummary[]>();
      tasks.forEach((task) => task.assignee && people.set(task.assignee.id, [...(people.get(task.assignee.id) ?? []), task]));
      [...people.values()].sort((a, b) => b.length - a.length).forEach((ts) => {
        const who = ts[0].assignee!;
        items.push({ type: 'person', key: `p-${who.id}`, id: who.id, name: who.displayName, count: ts.length, late: 0 });
        first(ts).forEach((task) => items.push({ type: 'task', key: task.id, task }));
      });
    } else {
      (['needsYou', 'onHold', 'pending', 'accepted'] as const).forEach((g) => {
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
            <Text variant="subhead" color="ink2">{count !== undefined && count !== null ? `${t(kind === 'completed' ? 'browse.taskCount' : 'browse.openCount', { count })} · ${sub}` : sub}</Text>
            {ordered && (
              <View style={{ marginTop: space.md }}>
                <Segmented<Order> options={ORDERS.map((o) => ({ value: o, label: t(`browse.order.${o}`) }))} value={order} onChange={setOrder} accessibilityLabel={t('browse.order.label')} />
              </View>
            )}
            {scoped && !person && (!!loaded.length || !!show) && (
              <View style={{ marginTop: space.md }}>
                <FilterStrip<Show>
                  groupLabel={t(`browse.groupBy.${groupBy}`)}
                  groupAccessibilityLabel={`${t('browse.groupBy.title')}: ${t(`browse.groupBy.${groupBy}`)}`}
                  onGroup={chooseGroup}
                  filters={SHOWS.map((f) => ({ value: f, label: t(`browse.show.${f}`) }))}
                  value={show}
                  onChange={setShow}
                />
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
          <Heading folds={scoped} folded={!!folded[item.key]} onPress={() => fold(item.key)}>
            {!!item.color && <ColorDot color={item.color} size={8} />}
            <Text variant="label" color={item.danger ? 'danger' : 'ink2'} accessibilityRole="header">{item.name}</Text>
            {item.count !== undefined && <Text variant="label" color="ink3">{item.count}</Text>}
          </Heading>
        );
      case 'person':
        return (
          <Heading folds={scoped} folded={!!folded[item.key]} onPress={() => fold(item.key)}>
            {item.id ? <Avatar name={item.name} seed={item.id} size={22} /> : <Feather name="user" size={18} color={colors.ink3} />}
            <Text variant="label" color="ink2" accessibilityRole="header">{item.name}</Text>
            <Text variant="label" color="ink3">{item.count}</Text>
            {item.late > 0 && <Text variant="label" color="danger">{t('browse.late', { count: item.late })}</Text>}
          </Heading>
        );
      case 'task':
        return kind === 'completed'
          ? <CompletedRow task={item.task} onPress={() => open(item.task)} />
          : <TaskRow task={item.task} today={today} showDue showList={!listed} showAssignment={given} hideFace={(given && group === 'person') || byPerson || !!person} onComplete={(task) => complete.mutate(task)} onPress={open} />;
      case 'footer':
        return pages.isPending || (whole && pages.hasNextPage) ? (
          <View>{[70, 55, 62].map((w) => <SkeletonRow key={w} width={w} />)}</View>
        ) : pages.hasNextPage ? (
          <View style={styles.footer}><ActivityIndicator color={colors.ink3} /></View>
        ) : !tasks.length ? (
          <Text variant="subhead" color="ink3" style={{ paddingVertical: space.lg }}>{scoped && show ? t('browse.showEmpty') : t(`browse.listEmptyFor.${kind}`)}</Text>
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

/** A group's heading; on All tasks (M78) a tap folds it, a chevron at the end. */
function Heading({ folds, folded, onPress, children }: { folds: boolean; folded: boolean; onPress(): void; children: ReactNode }) {
  const { colors, space } = useTheme();
  if (!folds) return <View style={[styles.group, { gap: space.sm, marginTop: space.lg }]}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: !folded }} style={[styles.group, styles.heading, { gap: space.sm, marginTop: space.md }]}>
      {children}
      <View style={styles.fill} />
      <Feather name={folded ? 'chevron-right' : 'chevron-down'} size={16} color={colors.ink3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: { minHeight: 44 },
  fill: { flex: 1 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  group: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 56 },
});
