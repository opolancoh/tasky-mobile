import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { formatLocalDate, nowIn } from '@/core/dates/localDate';
import { HOME_PREVIEW, useHome, useTaskLists, useTasks } from '@/data/tasks/queries';
import type { Home, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { LoadError } from '@/shared/components/LoadError';
import { MeButton } from '@/shared/components';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { Button, fonts, ListRow, radius, Screen, Skeleton, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { ActivityBell } from './components/ActivityBell';
import { NothingOpen } from './components/NothingOpen';
import { HomeCards, HomeCardsSkeleton } from './components/HomeCards';
import { homeRequests, RequestRow, type Request } from './components/RequestRows';
import { AssignedRow, TaskStreamRow, UndatedRow } from './components/StreamRows';
import { useHomeDismissed } from './homeDismissedStore';
import type { TodayListSection } from './todaySections';

/** Requests and Assigned to me show 3 rows on Home; Today and Coming up show HOME_PREVIEW (5). */
const SHORT = 3;
const NO_DISMISSED: string[] = [];

/** Home's rows, one list (FlashList) so long sections stay fast (docs/performance.md). */
type Item =
  | { type: 'header'; key: string }
  | { type: 'cards'; key: string }
  | { type: 'cardsSkeleton'; key: string }
  | { type: 'section'; key: string; title: string; count: number; seeAll?: TodayListSection }
  | { type: 'request'; key: string; request: Request }
  | { type: 'requestsRow'; key: string; count: number }
  | { type: 'task'; key: string; task: TaskSummary; when: 'time' | 'day' }
  | { type: 'assigned'; key: string; task: TaskSummary }
  | { type: 'undated'; key: string; task: TaskSummary }
  | { type: 'allDone'; key: string }
  | { type: 'nothingOpen'; key: string }
  | { type: 'skeletonSection'; key: string }
  | { type: 'skeletonRow'; key: string; width: number };

/**
 * Home, the first tab (06-mobile.md, M65): the date and what's next; four cards (Today, Overdue, Important, Inbox);
 * then Requests (swipe one left to dismiss it from Home), Today, Assigned to me and Coming up, each with its count, its
 * first rows and See all (TodayList, M33). Everything the user can see (M37), from GET /home (D67, D86). Me behind the
 * avatar (M39); notifications behind the bell beside it (Activity, M74). With nothing to show but tasks somewhere, From your lists: undated tasks
 * to plan (M66). With no open task and nothing to answer, an empty state and five ways to start under the cards (M67).
 */
export function TodayScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const home = useHome();
  const dismissed = useHomeDismissed((s) => (me ? s.byUser[me.id] : undefined)) ?? NO_DISMISSED;
  const [refreshing, setRefreshing] = useState(false);

  const now = me ? nowIn(me.timeZone) : undefined;
  const today = now?.date;
  const labels = useDateLabels(today);
  const data = home.data;
  // Nothing scheduled (M66): no requests, nothing overdue, today, assigned or coming up, but open tasks somewhere.
  const quiet = !!data && data.openTotal > 0 && !data.doneToday
    && !homeRequests(data, dismissed).left && ![data.overdue, data.today, data.assigned, data.comingUp].some((p) => p.total);
  const undated = useTasks({ due: ['none'], sort: 'created', limit: SHORT }, quiet);
  // First day (M51, M67): no open task anywhere and nothing to answer.
  const firstDay = !!data && !data.openTotal && !homeRequests(data, dismissed).total;
  // "All done" rather than "Nothing open here" when completed tasks are left: done today, or one completed at all.
  const completed = useTasks({ status: 'completed', limit: 1 }, firstDay && !data.doneToday);
  const allDone = !firstDay ? undefined : data.doneToday > 0 ? true : completed.data ? (completed.data.total ?? 0) > 0 : undefined;
  const open = (section: TodayListSection) => navigation.navigate('TodayList', { section });
  // Important and Personal open the same screens as Spaces (one list each, the same rows). No Personal yet (D59): nothing to open.
  const personal = useTaskLists().data?.find((c) => c.isInbox);
  const openImportant = () => navigation.navigate('BrowseList', { kind: 'important' });
  const openPersonal = () => personal && navigation.navigate('TaskList', { taskListId: personal.id, foldCompleted: true });   // M93

  const items: Item[] = [{ type: 'header', key: 'header' }];
  // First load (M27): skeleton cards, then sections and rows where they will be.
  if (!data && home.isPending) {
    items.push({ type: 'cardsSkeleton', key: 'kc' });
    items.push({ type: 'skeletonSection', key: 'ks1' }, ...[72, 55, 64].map((width, i) => ({ type: 'skeletonRow' as const, key: `kr1-${i}`, width })));
    items.push({ type: 'skeletonSection', key: 'ks2' }, ...[60, 48].map((width, i) => ({ type: 'skeletonRow' as const, key: `kr2-${i}`, width })));
  }

  if (data && today && me) {
    const requests = homeRequests(data, dismissed);
    // The cards always; with no open task and nothing to answer, a list's empty state and ways to start under them (M67).
    items.push({ type: 'cards', key: 'cards' });
    if (firstDay) items.push({ type: 'nothingOpen', key: 'nothing-open' });
    else {

      // Requests: 3 rows; all dismissed from Home → one row that opens them (M65).
      if (requests.shown.length) {
        items.push({ type: 'section', key: 's-requests', title: t('home.requests'), count: requests.left, seeAll: requests.left > SHORT ? 'requests' : undefined });
        requests.shown.slice(0, SHORT).forEach((request) => items.push({ type: 'request', key: request.key, request }));
      } else if (requests.left > 0) items.push({ type: 'requestsRow', key: 'requests-row', count: requests.left });

      const todayCount = data.today.total ?? 0;
      if (todayCount) {
        items.push({ type: 'section', key: 's-today', title: t('home.today'), count: todayCount, seeAll: todayCount > HOME_PREVIEW ? 'today' : undefined });
        data.today.items.forEach((task) => items.push({ type: 'task', key: `t-${task.id}`, task, when: 'time' }));
      } else if (!data.overdue.total && data.doneToday) items.push({ type: 'allDone', key: 'all-done' });

      const assigned = data.assigned.total ?? 0;
      if (assigned) {
        items.push({ type: 'section', key: 's-assigned', title: t('home.assigned'), count: assigned, seeAll: assigned > SHORT ? 'assigned' : undefined });
        data.assigned.items.slice(0, SHORT).forEach((task) => items.push({ type: 'assigned', key: `g-${task.id}`, task }));
      }

      const coming = data.comingUp.total ?? 0;
      if (coming) {
        items.push({ type: 'section', key: 's-coming', title: t('home.comingUp'), count: coming, seeAll: coming > HOME_PREVIEW ? 'coming-up' : undefined });
        data.comingUp.items.forEach((task) => items.push({ type: 'task', key: `c-${task.id}`, task, when: 'day' }));
      }

      const plan = quiet ? (undated.data?.total ?? 0) : 0;
      if (plan && undated.data) {
        items.push({ type: 'section', key: 's-undated', title: t('home.fromLists'), count: plan, seeAll: plan > SHORT ? 'undated' : undefined });
        undated.data.items.forEach((task) => items.push({ type: 'undated', key: `n-${task.id}`, task }));
      }
    }
  }

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([home.refetch(), quiet && undated.refetch()]);
    setRefreshing(false);
  };

  /** The line under the date: the next reminder later today, else overdue, else today's count; all done says what's next. */
  const nextLine = (d: Home) => {
    if (firstDay && allDone) return t('home.nothingToday');
    if (firstDay)
      return me?.tenant.type === 'organization' && me.tenant.name ? t('home.welcomeTo', { name: me.tenant.name }) : t('home.welcome', { name: me?.displayName.split(' ')[0] ?? '' });
    const next = d.today.items.find((task) => !!task.reminder && task.reminder.date === today && task.reminder.time.slice(0, 5) > now!.time);
    if (next) return <>{t('home.next')} <Text variant="subhead" style={{ fontFamily: fonts.semibold }}>{next.title}</Text> {t('home.at', { time: labels.time(next.reminder!.time) })}</>;
    const overdue = d.overdue.total ?? 0;
    if (overdue) return <Text variant="subhead" color="danger">{t('home.overdueSince', { count: overdue, date: labels.day(d.overdue.items[0].dueDate!) })}</Text>;
    if (d.today.total) return t('home.forToday', { count: d.today.total });
    if (d.doneToday) {
      const after = d.comingUp.items[0];
      return after ? t('home.allDoneNext', { title: after.title, day: labels.day(after.dueDate!) }) : t('home.allDoneWeek');
    }
    return t('home.nothingToday');
  };

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            {/* Activity behind the bell (M74); Me (profile, settings, sign out) behind the avatar (M39). */}
            <View style={[styles.bar, { gap: space.sm }]}>
              <ActivityBell />
              <MeButton />
            </View>
            <Text variant="title" numberOfLines={1} accessibilityRole="header">
              {today ? formatLocalDate(today, i18n.language, { weekday: 'long', month: 'short', day: 'numeric' }) : ''}
            </Text>
            {data && today ? (
              <Text variant="subhead" color="ink2" numberOfLines={1}>
                {nextLine(data)}
              </Text>
            ) : (
              <View accessible accessibilityLabel={t('home.loading')} style={{ paddingTop: space.xs }}>
                <Skeleton width={170} height={12} />
              </View>
            )}
            {home.error && !data && <LoadError error={home.error} onRetry={() => void home.refetch()} />}
          </View>
        );
      case 'cards':
        return <HomeCards data={data!} today={today!} open={open} openImportant={openImportant} openPersonal={openPersonal} />;
      case 'cardsSkeleton':
        return <HomeCardsSkeleton />;
      case 'section':
        return (
          <View style={[styles.sectionHead, { marginTop: space.xl, gap: space.sm }]}>
            <Text variant="label" color="ink2" accessibilityRole="header">
              {item.title}
            </Text>
            <Text variant="label" color="ink3">
              {item.count}
            </Text>
            {item.seeAll && (
              <View style={styles.push}>
                <Button variant="link" title={t('home.seeAll')} onPress={() => open(item.seeAll!)} />
              </View>
            )}
          </View>
        );
      case 'request':
        return <RequestRow userId={me!.id} request={item.request} today={today!} />;
      case 'requestsRow':
        return (
          <View style={{ marginTop: space.lg }}>
            <ListRow
              label={t('home.requests')}
              icon={<Feather name="user" size={18} color={colors.warn} />}
              value={String(item.count)}
              onPress={() => open('requests')}
            />
          </View>
        );
      case 'task':
        return <TaskStreamRow task={item.task} today={today!} when={item.when} />;
      case 'assigned':
        return <AssignedRow task={item.task} today={today!} />;
      case 'undated':
        return <UndatedRow task={item.task} today={today!} />;
      case 'allDone': {
        const after = data!.comingUp.items[0];
        return (
          <View style={[styles.calm, { backgroundColor: colors.surface2, padding: space.md, gap: space.md, marginTop: space.lg }]}>
            <View style={[styles.calmIcon, { backgroundColor: colors.successSoft }]}>
              <Feather name="check" size={18} color={colors.success} />
            </View>
            <View style={styles.fill}>
              <Text variant="bodyMedium">{t('home.allDoneTitle')}</Text>
              <Text variant="footnote" color="ink2" numberOfLines={2}>
                {t('home.completed', { count: data!.doneToday })}
                {after ? ` ${t('home.nextIs', { title: after.title, day: labels.day(after.dueDate!) })}` : ''}
              </Text>
            </View>
          </View>
        );
      }
      case 'nothingOpen':
        return <NothingOpen done={allDone} />;
      case 'skeletonSection':
        return <Skeleton width={92} height={12} style={{ marginTop: space.xl + space.xs, marginBottom: space.xs }} />;
      case 'skeletonRow':
        return <SkeletonRow width={item.width} />;
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
  bar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', minHeight: 44 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  push: { marginLeft: 'auto' },
  calm: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg },
  calmIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
