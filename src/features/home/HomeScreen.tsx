import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { addDays, formatLocalDate, nowIn } from '@/core/dates/localDate';
import { useAnswerAssignment, useCompleteTask, useUpdateTask } from '@/data/tasks/mutations';
import { useCollections, useTaskList } from '@/data/tasks/queries';
import type { Collection, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { TaskRow } from '@/shared/components';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { errorMessage } from '@/shared/i18n/errors';
import { useSession } from '@/shared/session/SessionProvider';
import { useCurrentWorkspace } from '@/shared/session/useCurrentWorkspace';
import { Button, Notice, radius, Screen, Text, useTheme } from '@/shared/ui';

/** Home's rows, one list (FlashList) so a long Today stays fast (docs/performance.md). */
type Item =
  | { type: 'header'; key: string }
  | { type: 'section'; key: string; title: string; count?: number; link?: { label: string; onPress(): void } }
  | { type: 'attention'; key: string; task: TaskSummary; kind: 'overdue' | 'pending'; first: boolean; last: boolean }
  | { type: 'task'; key: string; task: TaskSummary; showDue: boolean }
  | { type: 'calm'; key: string; icon: ComponentProps<typeof Feather>['name']; title: string; body: string }
  | { type: 'day'; key: string; label: string; date: string; first: string; more: number; count: number }
  | { type: 'inbox'; key: string; count: number }
  | { type: 'signOut'; key: string };

const IMPORTANT_SHOWN = 3;
const WEEK = 7;
/** The largest page the API serves; Today and the week fit in one. */
const LIST_MAX = 200;

/**
 * Home (06-mobile.md, M23): the start of the day. Needs attention (overdue, assignments to answer; hidden
 * when empty), Today, Important (up to 3 not due today), Coming up (next 7 days by day, then Later), Inbox.
 * Data: the task list, GET /tasks (D51–D53); Coming up is grouped by day here.
 */
export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const { signOut } = useSession();
  const me = useMe().data;
  const workspace = useCurrentWorkspace();
  const wid = workspace?.id;

  const now = me ? nowIn(me.timeZone) : undefined;
  const today = now?.date;
  const weekEnd = today ? addDays(today, WEEK) : undefined;
  // Overdue and today in one list (soonest first); the next 7 days; the first task after them (its total for "+N more").
  const todayView = useTaskList(wid, { due: ['overdue', 'today'], limit: LIST_MAX });
  const week = useTaskList(today ? wid : undefined, { due: ['upcoming'], dueTo: weekEnd, limit: LIST_MAX });
  const later = useTaskList(today ? wid : undefined, { dueFrom: today ? addDays(today, WEEK + 1) : undefined, limit: 1 });
  const pending = useTaskList(wid, { assignee: 'me', assignment: 'pending' });
  const important = useTaskList(wid, { important: true, due: ['upcoming', 'none'], limit: IMPORTANT_SHOWN });
  const collections = useCollections(wid).data;
  const inbox = collections?.find((c) => c.isInbox);
  const toSort = useTaskList(inbox ? wid : undefined, { collectionId: inbox?.id, due: ['none'], limit: 1 });

  const complete = useCompleteTask(wid);
  const update = useUpdateTask(wid);
  const answer = useAnswerAssignment(wid);
  const [refreshing, setRefreshing] = useState(false);

  const labels = useDateLabels(today);
  const collectionOf = (task: TaskSummary): Collection | undefined => collections?.find((c) => c.id === task.collectionId);

  const all = todayView.data?.items ?? [];
  const overdue = all.filter((x) => !!x.dueDate && !!today && x.dueDate < today);
  const dueToday = all.filter((x) => x.dueDate === today);
  const asks = pending.data?.items ?? [];
  // The next 7 days by date (the list comes soonest first), only days with tasks.
  const days: { date: string; items: TaskSummary[] }[] = [];
  for (const task of week.data?.items ?? []) {
    const last = days[days.length - 1];
    if (last?.date === task.dueDate) last.items.push(task);
    else days.push({ date: task.dueDate!, items: [task] });
  }
  const laterFirst = later.data?.items[0];
  const laterCount = later.data?.total ?? 0;
  const error = todayView.error ?? week.error ?? complete.error ?? update.error ?? answer.error;

  const items: Item[] = [{ type: 'header', key: 'header' }];

  // Needs attention: only when something does (hidden otherwise).
  const attention = [...overdue.map((task) => ({ task, kind: 'overdue' as const })), ...asks.map((task) => ({ task, kind: 'pending' as const }))];
  if (attention.length) {
    items.push({ type: 'section', key: 's-attention', title: t('home.attention') });
    attention.forEach(({ task, kind }, i) => items.push({ type: 'attention', key: `a-${task.id}`, task, kind, first: i === 0, last: i === attention.length - 1 }));
  }

  items.push({ type: 'section', key: 's-today', title: t('home.today'), count: dueToday.length });
  if (dueToday.length) dueToday.forEach((task) => items.push({ type: 'task', key: `t-${task.id}`, task, showDue: false }));
  else if (todayView.data) {
    const next = days[0]?.items[0];
    items.push(
      next
        ? { type: 'calm', key: 'calm', icon: 'calendar', title: t('home.nothingToday'), body: t('home.next', { when: labels.day(next.dueDate!), title: next.title }) }
        : { type: 'calm', key: 'calm', icon: 'sun', title: t('home.nothingPlanned'), body: t('home.nothingPlannedBody') },
    );
  }

  const importantItems = important.data?.items ?? [];
  if (importantItems.length) {
    items.push({ type: 'section', key: 's-important', title: t('home.important'), count: important.data?.total ?? importantItems.length });
    importantItems.forEach((task) => items.push({ type: 'task', key: `i-${task.id}`, task, showDue: true }));
  }

  if (days.length || laterFirst) {
    const toUpcoming = () => navigation.navigate('Tabs', { screen: 'Upcoming' });
    items.push({
      type: 'section',
      key: 's-coming',
      title: t('home.comingUp'),
      count: days.reduce((n, d) => n + d.items.length, 0) + laterCount,
      link: { label: t('home.seeAll'), onPress: toUpcoming },
    });
    days.forEach((d) =>
      items.push({
        type: 'day',
        key: `d-${d.date}`,
        label: labels.day(d.date),
        date: formatLocalDate(d.date, i18n.language, { month: 'short', day: 'numeric' }),
        first: d.items[0]!.title,
        more: d.items.length - 1,
        count: d.items.length,
      }),
    );
    if (laterFirst && weekEnd)
      items.push({
        type: 'day',
        key: 'd-later',
        label: t('home.later'),
        date: t('home.after', { date: formatLocalDate(weekEnd, i18n.language, { month: 'short', day: 'numeric' }) }),
        first: laterFirst.title,
        more: laterCount - 1,
        count: laterCount,
      });
  }

  const sortCount = toSort.data?.total ?? 0;
  if (sortCount > 0) items.push({ type: 'inbox', key: 'inbox', count: sortCount });
  items.push({ type: 'signOut', key: 'signOut' });   // until Settings exists

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([todayView.refetch(), week.refetch(), later.refetch(), pending.refetch(), important.refetch(), toSort.refetch()]);
    setRefreshing(false);
  };

  const summary = [
    t('home.forToday', { count: dueToday.length }),
    overdue.length > 0 && t('home.overdueCount', { count: overdue.length }),
    asks.length > 0 && t('home.toAccept', { count: asks.length }),
  ].filter(Boolean).join(' · ');
  const hour = Number(now?.time.slice(0, 2) ?? 9);
  const greeting = t(hour < 12 ? 'home.morning' : hour < 18 ? 'home.afternoon' : 'home.evening', { name: me?.displayName.split(' ')[0] ?? '' });

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingTop: space.xl, paddingBottom: space.md, gap: space.xxs }}>
            <Text variant="label" color="ink3">
              {today ? formatLocalDate(today, i18n.language, { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
            </Text>
            <Text variant="title" numberOfLines={1}>
              {greeting}
            </Text>
            {todayView.data && (
              <Text variant="subhead" color="ink2">
                {summary}
              </Text>
            )}
            {error && (
              <View style={{ marginTop: space.md }}>
                <Notice>{errorMessage(error)}</Notice>
              </View>
            )}
          </View>
        );
      case 'section':
        return (
          <View style={[styles.sectionHead, { marginTop: space.xl, marginBottom: space.xs, gap: space.sm }]}>
            <Text variant="label" color="ink2" accessibilityRole="header">
              {item.title}
            </Text>
            {item.count !== undefined && (
              <Text variant="label" color="ink3">
                {item.count}
              </Text>
            )}
            {item.link && (
              <View style={styles.push}>
                <Button variant="link" title={item.link.label} onPress={item.link.onPress} />
              </View>
            )}
          </View>
        );
      case 'attention':
        return (
          <View
            style={[
              styles.attention,
              { backgroundColor: colors.surface2, paddingHorizontal: space.md, paddingTop: space.sm, gap: space.sm },
              item.first && styles.top,
              item.last ? styles.bottom : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
            ]}
          >
            <View style={[styles.attnIcon, { backgroundColor: item.kind === 'overdue' ? colors.dangerSoft : colors.warnSoft }]}>
              <Feather name={item.kind === 'overdue' ? 'flag' : 'user'} size={16} color={item.kind === 'overdue' ? colors.danger : colors.warn} />
            </View>
            <View style={styles.main}>
              <Text variant="bodyMedium" numberOfLines={1}>
                {item.task.title}
              </Text>
              <Text variant="footnote" color="ink3" numberOfLines={1}>
                {item.kind === 'overdue'
                  ? t('home.overdueSince', { date: labels.day(item.task.dueDate!) })
                  : item.task.dueDate ? t('home.assignedDue', { date: labels.day(item.task.dueDate) }) : t('home.assigned')}
              </Text>
              <View style={[styles.actions, { gap: space.lg }]}>
                {item.kind === 'overdue' ? (
                  <Button variant="link" title={t('home.moveToToday')} onPress={() => today && update.mutate({ task: item.task, body: { dueDate: today } })} />
                ) : (
                  <>
                    <Button variant="link" title={t('home.reject')} onPress={() => answer.mutate({ task: item.task, accept: false })} />
                    <Button variant="link" title={t('home.accept')} onPress={() => answer.mutate({ task: item.task, accept: true })} />
                  </>
                )}
              </View>
            </View>
          </View>
        );
      case 'task':
        return <TaskRow task={item.task} collection={collectionOf(item.task)} today={today} showDue={item.showDue} onComplete={(task) => complete.mutate(task)} />;
      case 'calm':
        return (
          <View style={[styles.calm, { backgroundColor: colors.surface2, padding: space.md, gap: space.md, marginTop: space.xs }]}>
            <View style={[styles.attnIcon, { backgroundColor: colors.accentSoft }]}>
              <Feather name={item.icon} size={18} color={colors.accent} />
            </View>
            <View style={styles.main}>
              <Text variant="bodyMedium">{item.title}</Text>
              <Text variant="footnote" color="ink2" numberOfLines={2}>
                {item.body}
              </Text>
            </View>
          </View>
        );
      case 'day':
        return (
          <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Upcoming' })} accessibilityRole="button">
            {({ pressed }) => (
              <View style={[styles.day, { gap: space.md, paddingVertical: space.sm + 2, borderBottomColor: colors.line, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
                <View style={styles.when}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text variant="footnote" color="ink3" numberOfLines={1}>
                    {item.date}
                  </Text>
                </View>
                <Text variant="subhead" color="ink2" numberOfLines={1} style={styles.main}>
                  {item.more > 0 ? t('home.andMore', { title: item.first, count: item.more }) : item.first}
                </Text>
                <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
                  <Text variant="label" color="accent">
                    {item.count}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        );
      case 'inbox':
        return (
          <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Browse' })} accessibilityRole="button" style={{ marginTop: space.xl }}>
            {({ pressed }) => (
              <View style={[styles.day, { gap: space.md, paddingVertical: space.sm + 2, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
                <Feather name="inbox" size={20} color={colors.accent} />
                <Text variant="body" style={styles.main}>
                  {t('home.inbox')}
                </Text>
                <Text variant="subhead" color="ink3">
                  {t('home.toSort', { count: item.count })}
                </Text>
                <Feather name="chevron-right" size={18} color={colors.ink3} />
              </View>
            )}
          </Pressable>
        );
      case 'signOut':
        return (
          <View style={{ alignItems: 'center', paddingVertical: space.xxl }}>
            <Button variant="link" title={t('common.signOut')} onPress={signOut} />
          </View>
        );
    }
  };

  return (
    <Screen edges={['top']} contentStyle={styles.fill}>
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink3} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  push: { marginLeft: 'auto' },
  attention: { flexDirection: 'row', alignItems: 'flex-start' },
  top: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  bottom: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, paddingBottom: 4 },
  attnIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', marginLeft: -2 },
  calm: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg },
  day: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
  when: { width: 84 },
  badge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
});
