import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { todayIn } from '@/core/dates/localDate';
import { useCompleteTask, useUpdateTask } from '@/data/tasks/mutations';
import { HOME_PAGE, useHome, useHomeSection, useInvitations } from '@/data/tasks/queries';
import type { MyInvitation, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { CompletedHeading } from '@/shared/components/CompletedHeading';
import { TaskRow } from '@/shared/components';
import { CompletedRow } from '@/shared/components/CompletedRow';
import { LoadError } from '@/shared/components/LoadError';
import { useFoldedLists } from '@/shared/hooks/foldedListsStore';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';
import { Pill, Screen, SkeletonRow, Text, useTheme, useToast } from '@/shared/ui';

import { AskRow, FollowUpRow, HoldRow, InvitationRow } from './components/StreamRows';
import type { TodayListSection } from './todaySections';

type Item =
  | { type: 'header'; key: string }
  | { type: 'invitation'; key: string; invitation: MyInvitation }
  | { type: 'ask'; key: string; task: TaskSummary }
  | { type: 'follow'; key: string; task: TaskSummary }
  | { type: 'hold'; key: string; task: TaskSummary }
  | { type: 'overdue'; key: string; task: TaskSummary }
  | { type: 'task'; key: string; task: TaskSummary }
  | { type: 'doneHead'; key: string; folded: boolean; count: number }
  | { type: 'done'; key: string; task: TaskSummary }
  | { type: 'footer'; key: string };

/** Today's Completed fold, kept with the lists' (M63, M105). */
const TODAY_FOLD = 'today';

/**
 * What a card or See all on Home opens (06-mobile.md, M105): Today (by reminder time, then the rest; its Completed at the
 * end, folding, remembered), Overdue (oldest first), Requests (invitations, then tasks to answer, follow-ups, holds). Title,
 * total and what it holds; 20 at a time, the next page as the list nears its end (keyset cursor), "All N shown" at the end.
 */
export function TodayListScreen({ route }: StaticScreenProps<{ section: TodayListSection }>) {
  const { section } = route.params;
  const { t } = useTranslation();
  const { colors, radius, space } = useTheme();
  const navigation = useNavigation();
  const complete = useCompleteTask();
  const update = useUpdateTask();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;

  const requests = section === 'requests';
  const isToday = section === 'today';
  const tasks = useHomeSection(requests ? 'to-answer' : section);
  const followUp = useHomeSection('follow-up', requests && tasks.isSuccess && !tasks.hasNextPage);
  const holds = useHomeSection('holds', requests && followUp.isSuccess && !followUp.hasNextPage);   // D91: after the follow-ups
  const invitations = useInvitations(requests);
  // Today's Completed: its count from Home (GET /home), its rows only while open and once the open ones are all in.
  const home = useHome();
  const doneCount = home.data?.counts.doneToday ?? 0;
  const userId = me?.id ?? '';
  const folded = useFoldedLists((s) => !!s.byUser[userId]?.[TODAY_FOLD]);
  const showDone = isToday && doneCount > 0 && !folded && tasks.isSuccess && !tasks.hasNextPage;
  const done = useHomeSection('done-today', showDone);

  const taskItems = tasks.data?.pages.flatMap((p) => p.items) ?? [];
  const followItems = requests ? (followUp.data?.pages.flatMap((p) => p.items) ?? []) : [];
  const holdItems = requests ? (holds.data?.pages.flatMap((p) => p.items) ?? []) : [];
  const invitationItems = requests ? (invitations.data ?? []) : [];
  const doneItems = showDone ? (done.data?.pages.flatMap((p) => p.items) ?? []) : [];

  const total = requests ? invitationItems.length + (tasks.data?.pages[0]?.total ?? 0) + (followUp.data?.pages[0]?.total ?? 0) + (holds.data?.pages[0]?.total ?? 0)
    : tasks.data?.pages[0]?.total ?? undefined;
  const shown = invitationItems.length + taskItems.length + followItems.length + holdItems.length;
  const hasMore = requests ? !!tasks.hasNextPage || !followUp.isSuccess || !!followUp.hasNextPage || !holds.isSuccess || !!holds.hasNextPage
    : !!tasks.hasNextPage || (showDone && (!done.isSuccess || !!done.hasNextPage));
  const loading = tasks.isPending;
  // Only a load with nothing to show; a failed refresh keeps the list and shows Can't connect's capsule (M90).
  const error = [tasks, followUp, invitations].find((q) => q.error && q.data === undefined)?.error;
  const retry = () => { void tasks.refetch(); void followUp.refetch(); void invitations.refetch(); };

  const refreshControl = usePullRefresh(tasks, followUp, holds, invitations, home, done);

  const loadMore = () => {
    if (tasks.hasNextPage) {
      if (!tasks.isFetchingNextPage) tasks.fetchNextPage();
    } else if (requests && followUp.hasNextPage && !followUp.isFetchingNextPage) followUp.fetchNextPage();
    else if (requests && holds.hasNextPage && !holds.isFetchingNextPage) holds.fetchNextPage();
    else if (showDone && done.hasNextPage && !done.isFetchingNextPage) done.fetchNextPage();
  };

  const items: Item[] = [{ type: 'header', key: 'header' }];
  if (requests) {
    invitationItems.forEach((invitation) => items.push({ type: 'invitation', key: `v-${invitation.id}`, invitation }));
    taskItems.forEach((task) => items.push({ type: 'ask', key: `a-${task.id}`, task }));
    followItems.forEach((task) => items.push({ type: 'follow', key: `f-${task.id}`, task }));
    holdItems.forEach((task) => items.push({ type: 'hold', key: `h-${task.id}`, task }));
  } else if (section === 'overdue') taskItems.forEach((task) => items.push({ type: 'overdue', key: `o-${task.id}`, task }));
  else {
    taskItems.forEach((task) => items.push({ type: 'task', key: `t-${task.id}`, task }));
    if (isToday && doneCount > 0 && !tasks.hasNextPage && tasks.isSuccess) {
      items.push({ type: 'doneHead', key: 'done-head', folded, count: doneCount });
      doneItems.forEach((task) => items.push({ type: 'done', key: `c-${task.id}`, task }));
    }
  }
  items.push({ type: 'footer', key: 'footer' });

  const openTask = (task: TaskSummary) => navigation.navigate('TaskDetail', { taskId: task.id });
  const title = t(`todayList.title.${section}`);
  // The hub's line (M105): "6 open · 3 done", "28 overdue · oldest first", "3 waiting on you"; none at 0.
  const line = total === undefined || total + (isToday ? doneCount : 0) === 0 ? null
    : isToday ? t('todayList.line.today', { open: total, done: doneCount }) : t(`todayList.line.${section}`, { count: total });

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            <Text variant="title" accessibilityRole="header">{title}</Text>
            {line && <Text variant="subhead" color="ink2">{line}</Text>}
            {error && <LoadError error={error} onRetry={retry} />}
          </View>
        );
      case 'invitation':
        return <InvitationRow invitation={item.invitation} />;
      case 'ask':
        return <AskRow task={item.task} today={today!} />;
      case 'follow':
        return <FollowUpRow task={item.task} />;
      case 'hold':
        return <HoldRow task={item.task} />;
      case 'overdue':
        return (
          <TaskRow
            task={item.task} today={today} onComplete={(task) => complete.mutate(task)} onPress={openTask}
            action={<Pill label={t('today.toToday')} onPress={() => update.mutate({ task: item.task, body: { dueDate: today! } }, { onSuccess: () => useToast.getState().show({ message: t('today.movedToday') }) })} disabled={update.isPending} />}
          />
        );
      case 'task':
        return <TaskRow task={item.task} today={today} showTime onComplete={(task) => complete.mutate(task)} onPress={openTask} />;
      case 'doneHead':
        return <CompletedHeading folded={item.folded} count={item.count} onPress={() => userId && useFoldedLists.getState().setFolded(userId, TODAY_FOLD, !item.folded)} />;
      case 'done':
        return <CompletedRow task={item.task} onPress={() => openTask(item.task)} />;
      case 'footer':
        return loading ? (
          <View>{[70, 55, 62].map((w) => <SkeletonRow key={w} width={w} />)}</View>
        ) : hasMore ? (
          <View style={[styles.footer, { gap: space.sm }]} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.ink3} />
            <Text variant="footnote" color="ink3">{t('todayList.loadingMore')}</Text>
          </View>
        ) : shown === 0 && !(isToday && doneCount) ? (
          <View style={[styles.empty, { backgroundColor: colors.surface2, borderRadius: radius.md, padding: space.md, gap: space.md, marginTop: space.xs }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.successSoft }]}>
              <Feather name="check" size={18} color={colors.success} />
            </View>
            <View style={styles.fill}>
              <Text variant="bodyMedium">{t(`todayList.empty.${section}.title`)}</Text>
              <Text variant="footnote" color="ink2">{t(`todayList.empty.${section}.line`)}</Text>
            </View>
          </View>
        ) : shown > HOME_PAGE ? (
          <View style={styles.footer}>
            <Text variant="footnote" color="ink3">{t('todayList.allShown', { count: shown })}</Text>
          </View>
        ) : null;
    }
  };

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  empty: { flexDirection: 'row', alignItems: 'center' },
  emptyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 56 },
});
