import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { formatLocalDate, nowIn } from '@/core/dates/localDate';
import { useHome, useTaskLists } from '@/data/tasks/queries';
import type { Home } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { LoadError } from '@/shared/components/LoadError';
import { useHomeCache } from '@/shared/session/homeCacheStore';
import { BrowseRow, BrowseRowSkeleton } from '@/shared/components/BrowseRow';
import { MeButton } from '@/shared/components';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { Button, fonts, Screen, Skeleton, Text, useTheme } from '@/shared/ui';

import { ActivityBell } from './components/ActivityBell';
import { HomeCards, HomeCardsSkeleton } from './components/HomeCards';
import { homeRequests, RequestRow, type Request } from './components/RequestRows';
import type { TodayListSection } from './todaySections';

/** Requests shows 3 rows on Home; See all has the rest. */
const SHORT = 3;

type Tone = 'accent' | 'danger' | 'warn' | 'quiet';

/** Home's rows, one list (FlashList) so the screen stays fast (docs/performance.md). */
type Item =
  | { type: 'header'; key: string }
  | { type: 'cards'; key: string }
  | { type: 'cardsSkeleton'; key: string }
  | { type: 'section'; key: string; title: string; count?: number; seeAll?: boolean }
  | { type: 'request'; key: string; request: Request }
  | { type: 'row'; key: string; label: string; icon: ComponentProps<typeof Feather>['name']; tone: Tone; count?: number; zero?: boolean; sub?: ReactNode; onPress(): void }
  | { type: 'skeletonSection'; key: string }
  | { type: 'skeletonRow'; key: string; width: number };

/**
 * Home, the first tab (06-mobile.md, M105): the date and what's next; two cards (Today, Overdue); Requests (3 rows and See
 * all; they leave only when answered); My stuff (Important, Personal, Reminders in the next 7 days); Assignments (by me, to
 * me: the count, a red "2 late" only when some are late); More (All tasks, Completed, Archived, Recently Deleted: no counts,
 * nothing loads until opened). Everything from GET /home alone (D107). Me behind the avatar (M39); Activity behind the bell (M74).
 */
export function TodayScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const home = useHome();
  const [refreshing, setRefreshing] = useState(false);

  const now = me ? nowIn(me.timeZone) : undefined;
  const today = now?.date;
  const labels = useDateLabels(today);
  // The last Home on this device shows at once while GET /home refreshes it.
  const cached = useHomeCache((s) => (me ? s.byUser[me.id] : undefined));
  const data = home.data ?? cached;
  useEffect(() => {
    if (me && home.data) useHomeCache.getState().save(me.id, home.data);
  }, [me, home.data]);
  // No Personal yet (D59): its row opens nothing.
  const personal = useTaskLists().data?.find((c) => c.isInbox);
  const open = (section: TodayListSection) => navigation.navigate('TodayList', { section });

  const items: Item[] = [{ type: 'header', key: 'header' }];
  // First load (M27): skeleton cards, then sections and rows where they will be.
  if (!data && home.isPending) {
    items.push({ type: 'cardsSkeleton', key: 'kc' });
    items.push({ type: 'skeletonSection', key: 'ks1' }, ...[60, 48, 66].map((width, i) => ({ type: 'skeletonRow' as const, key: `kr1-${i}`, width })));
    items.push({ type: 'skeletonSection', key: 'ks2' }, ...[64, 58].map((width, i) => ({ type: 'skeletonRow' as const, key: `kr2-${i}`, width })));
  }

  if (data && today) {
    const c = data.counts;
    const requests = homeRequests(data);
    const late = (n: number) => (n ? <Text variant="footnote" color="danger">{t('home.late', { count: n })}</Text> : undefined);
    const urgency = (overdue: number, due: number, soon: number, usual: string) =>
      overdue || due ? (
        <Text variant="footnote" color="ink3" numberOfLines={1}>
          {overdue ? <Text variant="footnote" color="danger">{t('home.overdueN', { count: overdue })}</Text> : null}
          {overdue && due ? ' · ' : ''}
          {due ? t('home.todayN', { count: due }) : ''}
        </Text>
      ) : soon ? t('home.comingUpN', { count: soon }) : usual;
    items.push({ type: 'cards', key: 'cards' });
    if (requests.length) {
      items.push({ type: 'section', key: 's-requests', title: t('home.requests'), count: data.requests.total, seeAll: data.requests.total > SHORT });
      requests.slice(0, SHORT).forEach((request) => items.push({ type: 'request', key: request.key, request }));
    }
    items.push(
      { type: 'section', key: 's-mine', title: t('home.myStuff') },
      { type: 'row', key: 'important', label: t('home.important'), icon: 'flag', tone: 'danger', count: c.important, sub: c.important ? urgency(c.importantOverdue, c.importantToday, c.importantComingUp, t('home.soonestFirst')) : t('home.noneFlagged'), onPress: () => navigation.navigate('BrowseList', { kind: 'important' }) },
      { type: 'row', key: 'personal', label: t('home.inbox'), icon: 'inbox', tone: 'accent', count: c.personal, sub: c.personal ? urgency(c.personalOverdue, c.personalToday, c.personalComingUp, t('home.justForYou')) : t('home.nothingOpen'), onPress: () => personal && navigation.navigate('TaskList', { taskListId: personal.id }) },
      { type: 'row', key: 'reminders', label: t('home.reminders'), icon: 'bell', tone: 'warn', count: c.remindersNext7Days, sub: t(c.remindersNext7Days ? 'home.next7Days' : 'home.noneComingUp'), onPress: () => navigation.navigate('Reminders') },
      { type: 'section', key: 's-assignments', title: t('home.assignments') },
      { type: 'row', key: 'byMe', label: t('browse.assignedBy'), icon: 'send', tone: 'accent', count: c.assignedByMe, zero: true, sub: late(c.assignedByMeLate), onPress: () => navigation.navigate('BrowseList', { kind: 'assignedBy' }) },
      { type: 'row', key: 'toMe', label: t('browse.assigned'), icon: 'user', tone: 'accent', count: c.assignedToMe, zero: true, sub: late(c.assignedToMeLate), onPress: () => navigation.navigate('BrowseList', { kind: 'assigned' }) },
      // More (moved from Spaces, M105): no counts; each loads only when opened.
      { type: 'section', key: 's-more', title: t('browse.more') },
      { type: 'row', key: 'all', label: t('browse.allTasks'), icon: 'layers', tone: 'quiet', onPress: () => navigation.navigate('BrowseList', { kind: 'all' }) },
      { type: 'row', key: 'done', label: t('browse.completed'), icon: 'check-circle', tone: 'quiet', onPress: () => navigation.navigate('BrowseList', { kind: 'completed' }) },
      { type: 'row', key: 'archived', label: t('browse.archivedList'), icon: 'archive', tone: 'quiet', onPress: () => navigation.navigate('Archived') },
      { type: 'row', key: 'deleted', label: t('browse.recentlyDeleted'), icon: 'trash-2', tone: 'quiet', onPress: () => navigation.navigate('RecentlyDeleted') },
    );
  }

  const refresh = async () => {
    setRefreshing(true);
    await home.refetch();
    setRefreshing(false);
  };

  /** The line under the date: the next reminder later today, else overdue, else today's count; a new account is welcomed. */
  const nextLine = (d: Home) => {
    const c = d.counts;
    if (!c.openTotal && !d.requests.total)
      return me?.tenant.type === 'organization' && me.tenant.name ? t('home.welcomeTo', { name: me.tenant.name }) : t('home.welcome', { name: me?.displayName.split(' ')[0] ?? '' });
    if (d.next) return <>{t('home.next')} <Text variant="subhead" style={{ fontFamily: fonts.semibold }}>{d.next.title}</Text> {t('home.at', { time: labels.time(d.next.time) })}</>;
    if (c.overdue && c.overdueSince) return <Text variant="subhead" color="danger">{t('home.overdueSince', { count: c.overdue, date: labels.day(c.overdueSince) })}</Text>;
    if (c.today) return t('home.forToday', { count: c.today });
    return t(c.doneToday ? 'home.allDoneToday' : 'home.nothingToday');
  };

  const tones = { accent: [colors.accentSoft, colors.accent], danger: [colors.dangerSoft, colors.danger], warn: [colors.warnSoft, colors.warn], quiet: [colors.surface2, colors.ink2] } as const;

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.lg, gap: space.xs }}>
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
        return <HomeCards counts={data!.counts} today={today!} open={open} />;
      case 'cardsSkeleton':
        return <HomeCardsSkeleton />;
      case 'section':
        // The heading sits on its rows: no line under it (M105).
        return (
          <View style={[styles.sectionHead, { marginTop: space.xxl, gap: space.sm }]}>
            <Text variant="label" color="ink2" accessibilityRole="header" style={styles.caps}>
              {item.title}
            </Text>
            {item.count !== undefined && (
              <Text variant="label" color="ink3">
                {item.count}
              </Text>
            )}
            {item.seeAll && (
              <View style={styles.push}>
                <Button variant="link" title={t('home.seeAll')} onPress={() => open('requests')} />
              </View>
            )}
          </View>
        );
      case 'request':
        return <RequestRow request={item.request} today={today!} />;
      case 'row': {
        const [bg, fg] = tones[item.tone];
        return <BrowseRow label={item.label} icon={<Feather name={item.icon} size={17} color={fg} />} tint={bg} count={item.count} zero={item.zero} sub={item.sub} onPress={item.onPress} />;
      }
      case 'skeletonSection':
        return <Skeleton width={92} height={12} style={{ marginTop: space.xxl + space.xs, marginBottom: space.xs }} />;
      case 'skeletonRow':
        return <BrowseRowSkeleton width={item.width} />;
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
        contentContainerStyle={{ paddingBottom: space.huge }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink3} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', minHeight: 44 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  // Section names in capitals (M105), as in the hub.
  caps: { textTransform: 'uppercase', letterSpacing: 0.4 },
  push: { marginLeft: 'auto' },
});
