import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { todayIn } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { useCompleteTask } from '@/data/tasks/mutations';
import { useTaskLists, useTasks, useTeams, useTeamSummary } from '@/data/tasks/queries';
import type { TaskList, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { BarTitle, TaskRow, useBarTitle } from '@/shared/components';
import { StatCard, StatGrid, StatGridSkeleton } from '@/shared/components/StatCard';
import { LoadError } from '@/shared/components/LoadError';
import { CountPill, faint, listColor, Pill, Screen, Skeleton, SkeletonIcons, SkeletonRow, Text, useTheme } from '@/shared/ui';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';

import { useBrowseMenus } from './browseMenus';
import type { TeamShow } from './teamShow';
import { useShowBrowseSheet } from '@/shared/browseSheet/browseSheetStore';
import { BrowseRow } from '@/shared/components/BrowseRow';

type Item =
  | { type: 'header'; key: string }
  | { type: 'cards'; key: string }
  | { type: 'attentionHead'; key: string }
  | { type: 'task'; key: string; task: TaskSummary }
  | { type: 'attentionEmpty'; key: string }
  | { type: 'listsHead'; key: string }
  | { type: 'list'; key: string; list: TaskList }
  | { type: 'empty'; key: string }
  | { type: 'skeleton'; key: string; width: number };

const ATTENTION = 5;

/**
 * A team (M76, M144, as desktop's E60): the title and "3 lists · 4 people", as desktop; Late, This week,
 * Unassigned and Yours as cards (GET /teams/{id}/summary, D123), each opening those tasks; Needs attention (late, then
 * dated tasks nobody has; See all opens the team's tasks); the team's lists in the user's order with + New list. People
 * and ••• in the bar for everyone; ••• opens the team's menu by role.
 */
export function TeamScreen({ route }: StaticScreenProps<{ teamId: Id }>) {
  const { teamId } = route.params;
  const { t } = useTranslation();
  const { colors, space, scheme } = useTheme();
  const navigation = useNavigation();
  const teams = useTeams();
  const team = teams.data?.find((x) => x.id === teamId);
  const taskLists = useTaskLists();
  const lists = (taskLists.data ?? []).filter((c) => c.team?.id === teamId);
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const summary = useTeamSummary(teamId);
  const late = useTasks({ teamId, status: 'open', due: ['overdue'], limit: ATTENTION });
  const nobody = useTasks({ teamId, status: 'open', assignee: 'none', dueFrom: today, limit: ATTENTION }, !!today);
  const complete = useCompleteTask();
  const attention = [...(late.data?.items ?? []), ...(nobody.data?.items ?? [])].slice(0, ATTENTION);
  const attentionTotal = (late.data?.total ?? 0) + (nobody.data?.total ?? 0);
  const attentionLoading = late.isPending || nobody.isPending;
  const showSheet = useShowBrowseSheet();
  const { teamMenu, listMenu } = useBrowseMenus();
  const manages = team?.role === 'owner';
  const people = () => navigation.navigate('People', { kind: 'team', id: teamId });
  const newList = () => showSheet({ kind: 'list', teamId });
  // Only a load with nothing to show; a failed refresh keeps the screen and shows Can't connect's capsule (M90).
  const error = [teams, taskLists].find((q) => q.error && q.data === undefined)?.error;
  const retry = () => { teams.refetch(); taskLists.refetch(); };
  const refreshControl = usePullRefresh(teams, taskLists, summary, late, nobody);
  const show = (card: TeamShow) => navigation.navigate('BrowseList', { kind: 'team', id: teamId, card, backTitle: team?.name });
  const seeAll = () => navigation.navigate('BrowseList', { kind: 'team', id: teamId, backTitle: team?.name });

  const bar = useBarTitle();
  useLayoutEffect(() => {
    navigation.setOptions({
      // Scrolled, the bar shows the team's name over "3 lists" (M94).
      headerTitle: () => <BarTitle shown={bar.shown} title={team?.name ?? ''} line={taskLists.isPending ? undefined : lists.length ? t('browse.listCount', { count: lists.length }) : t('browse.noListsYet')} />,
      // Its actions wait for its lists (M115).
      headerRight: !team || taskLists.isPending
        ? () => <SkeletonIcons count={2} />
        : () => (
            <View style={styles.headerRight}>
              <Pressable onPress={people} accessibilityRole="button" accessibilityLabel={t('browse.peopleTitle')} style={styles.more}>
                <Feather name="users" size={21} color={colors.accent} />
              </Pressable>
              <Pressable onPress={() => teamMenu(team, () => navigation.goBack(), true)} accessibilityRole="button" accessibilityLabel={t('browse.menu.title')} style={styles.more}>
                <Feather name="more-horizontal" size={22} color={colors.accent} />
              </Pressable>
            </View>
          ),
    });
  });

  if (!team && !teams.isPending && !error) {
    return (
      <Screen edges={['bottom']}>
        <Text variant="subhead" color="ink2">{t('browse.teamGone')}</Text>
      </Screen>
    );
  }

  const items: Item[] = [{ type: 'header', key: 'header' }];
  if (!team || taskLists.isPending) {
    if (!error) [0, 58, 44, 66].forEach((width, i) => items.push(width ? { type: 'skeleton', key: `k${i}`, width } : { type: 'cards', key: 'cards' }));
  } else if (lists.length) {
    items.push({ type: 'cards', key: 'cards' }, { type: 'attentionHead', key: 'attentionHead' });
    if (attentionLoading) [58, 44, 66].forEach((width, i) => items.push({ type: 'skeleton', key: `a${i}`, width }));
    else if (attention.length) attention.forEach((task) => items.push({ type: 'task', key: `t-${task.id}`, task }));
    else items.push({ type: 'attentionEmpty', key: 'attentionEmpty' });
    items.push({ type: 'listsHead', key: 'listsHead' });
    lists.forEach((list) => items.push({ type: 'list', key: list.id, list }));
  } else items.push({ type: 'empty', key: 'empty' });

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            {team ? (
              <>
                <Text variant="largeTitle" accessibilityRole="header" numberOfLines={2}>{team.name}</Text>
                {!taskLists.isPending && (
                  <Text variant="subhead" color="ink3">{`${t('browse.listCount', { count: lists.length })} · ${t('browse.people', { count: team.members })}`}</Text>
                )}
              </>
            ) : !error && (
              <View style={{ gap: space.sm, paddingTop: space.xs }}>
                <Skeleton width={150} height={26} />
                <Skeleton width={120} height={14} />
              </View>
            )}
            {error && <LoadError error={error} onRetry={retry} />}
          </View>
        );
      case 'cards': {
        const c = summary.data;
        return c ? (
          <StatGrid>
            <StatCard tone={c.late ? 'danger' : 'plain'} icon="clock" count={c.late} label={t('browse.teamPage.late')} sub={c.late ? t('browse.teamPage.lateSub') : t('browse.teamPage.onTime')} onPress={() => show('late')} />
            <StatCard tone={c.thisWeek ? 'accent' : 'plain'} icon="calendar" count={c.thisWeek} label={t('browse.teamPage.thisWeek')} sub={t('browse.teamPage.thisWeekSub')} onPress={() => show('thisWeek')} />
            <StatCard tone={c.unassigned ? 'accent' : 'plain'} icon="user" count={c.unassigned} label={t('browse.teamPage.unassigned')} sub={t('browse.teamPage.unassignedSub')} onPress={() => show('unassigned')} />
            <StatCard tone={c.yours ? 'accent' : 'plain'} icon="check" count={c.yours} label={t('browse.teamPage.yours')} sub={t('browse.teamPage.yoursSub')} onPress={() => show('yours')} />
          </StatGrid>
        ) : <StatGridSkeleton count={4} />;
      }
      case 'attentionHead':
        return (
          <View style={[styles.section, { marginTop: space.xl, gap: space.xs }]}>
            <Text variant="label" color="ink2" accessibilityRole="header">{t('browse.teamPage.attention')}</Text>
            {attentionTotal > 0 && <CountPill count={attentionTotal} />}
            <View style={styles.fill} />
            {attentionTotal > ATTENTION && (
              <Pressable onPress={seeAll} accessibilityRole="button" hitSlop={8}>
                <Text variant="subhead" color="accent">{t('browse.teamPage.seeAll')}</Text>
              </Pressable>
            )}
          </View>
        );
      case 'task':
        return <TaskRow task={item.task} today={today} showDue onComplete={(task) => complete.mutate(task)} onPress={(task) => navigation.navigate('TaskDetail', { taskId: task.id })} />;
      case 'attentionEmpty':
        return <Text variant="footnote" color="ink3" style={{ paddingVertical: space.md }}>{t('browse.teamPage.nothingAttention')}</Text>;
      case 'listsHead':
        return (
          <View style={[styles.section, { marginTop: space.xl, gap: space.xs }]}>
            <Text variant="label" color="ink2" accessibilityRole="header">{t('browse.lists')}</Text>
            {lists.length > 0 && <CountPill count={lists.length} />}
            <View style={styles.fill} />
            {team && (
              <Pressable onPress={newList} accessibilityRole="button" accessibilityLabel={t('browse.menu.newListIn', { name: team.name })} style={styles.add}>
                <Feather name="plus" size={20} color={colors.accent} />
              </Pressable>
            )}
          </View>
        );
      case 'list': {
        const c = item.list;
        return <BrowseRow label={c.name} icon={<Feather name="list" size={17} color={listColor(c.color)} />} tint={faint(listColor(c.color), scheme)} count={c.openTasks ?? 0}
          onPress={() => navigation.navigate('TaskList', { taskListId: c.id, backTitle: team?.name })} onLongPress={() => listMenu(c)} />;
      }
      case 'empty':
        return (
          <View style={[styles.empty, { gap: space.xs, paddingVertical: space.huge }]}>
            <Feather name="list" size={28} color={colors.accent} />
            <Text variant="bodyMedium">{t('browse.noListsYet')}</Text>
            <Text variant="footnote" color="ink3" style={styles.center}>{t(team!.members > 1 ? 'browse.teamEmptyBody' : 'browse.teamEmptyAlone', { name: team!.name })}</Text>
            <View style={[styles.actions, { gap: space.sm, marginTop: space.md }]}>
              <Pill label={t('browse.newList')} icon={<Feather name="plus" size={15} color={colors.accent} />} onPress={newList} />
              {manages && team!.members === 1 && <Pill label={t('browse.invitePeople')} tone="quiet" icon={<Feather name="user-plus" size={15} color={colors.ink2} />} onPress={people} />}
            </View>
          </View>
        );
      case 'skeleton':
        return <SkeletonRow width={item.width} />;
    }
  };

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <FlashList
        refreshControl={refreshControl}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        onScroll={bar.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: space.huge }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  section: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  add: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10, marginVertical: -6 },
  empty: { alignItems: 'center' },
  center: { textAlign: 'center', maxWidth: 280 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
