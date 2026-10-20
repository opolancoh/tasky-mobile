import type { StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { addDays, todayIn } from '@/core/dates/localDate';
import { HOME_PAGE, useHomeSection, useInvitations, useTaskPages } from '@/data/tasks/queries';
import type { HomeSection, MyInvitation, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { LoadError } from '@/shared/components/LoadError';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { Screen, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { AskRow, AssignedRow, FollowUpRow, HoldRow, InvitationRow, OverdueRow, TaskStreamRow, UndatedRow } from './components/StreamRows';
import type { TodayListSection } from './todaySections';

type Item =
  | { type: 'header'; key: string }
  | { type: 'day'; key: string; label: string }
  | { type: 'invitation'; key: string; invitation: MyInvitation }
  | { type: 'ask'; key: string; task: TaskSummary }
  | { type: 'follow'; key: string; task: TaskSummary }
  | { type: 'hold'; key: string; task: TaskSummary }
  | { type: 'overdue'; key: string; task: TaskSummary }
  | { type: 'task'; key: string; task: TaskSummary; due?: boolean }
  | { type: 'assigned'; key: string; task: TaskSummary }
  | { type: 'undated'; key: string; task: TaskSummary }
  | { type: 'footer'; key: string };

/** The task section behind each See all (D67, D86); Requests pages its answers, then its follow-ups (D71). From your lists is GET /tasks (M66). */
const TASK_SECTION: Record<Exclude<TodayListSection, 'undated'>, HomeSection> = {
  requests: 'to-answer', overdue: 'overdue', today: 'today', 'coming-up': 'coming-up', assigned: 'assigned',
};
const WHEN = { today: 'time', 'coming-up': 'none' } as const;

/**
 * See all (06-mobile.md, M33): a whole Home section on its own screen, pushed from its See all or a card (M65). Title, total and what it holds; the same rows as Home (Coming up under day headings); 20 at a time, the next
 * page as the list nears its end (keyset cursor), "All N shown" at the end.
 */
export function TodayListScreen({ route }: StaticScreenProps<{ section: TodayListSection }>) {
  const { section } = route.params;
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const labels = useDateLabels(today);

  const requests = section === 'requests';
  const isUndated = section === 'undated';
  const homeTasks = useHomeSection(isUndated ? 'today' : TASK_SECTION[section], !isUndated);
  const undatedTasks = useTaskPages({ due: ['none'], sort: 'created', limit: HOME_PAGE }, isUndated);
  const tasks = isUndated ? undatedTasks : homeTasks;
  const toAnswerDone = requests && tasks.isSuccess && !tasks.hasNextPage;
  const followUp = useHomeSection('follow-up', toAnswerDone);
  const holds = useHomeSection('holds', requests && followUp.isSuccess && !followUp.hasNextPage);   // D91: after the follow-ups
  // Coming up's See all ends with Later: due after the next 7 days (M39), once the 7 days are all loaded.
  const coming = section === 'coming-up';
  const later = useTaskPages({ due: ['upcoming'], dueFrom: today ? addDays(today, 8) : undefined, sort: 'due', limit: HOME_PAGE }, coming && !!today && tasks.isSuccess && !tasks.hasNextPage);
  const laterItems = coming ? (later.data?.pages.flatMap((p) => p.items) ?? []) : [];
  const invitations = useInvitations(requests);

  const taskItems = tasks.data?.pages.flatMap((p) => p.items) ?? [];
  const followItems = requests ? (followUp.data?.pages.flatMap((p) => p.items) ?? []) : [];
  const holdItems = requests ? (holds.data?.pages.flatMap((p) => p.items) ?? []) : [];
  const invitationItems = requests ? (invitations.data ?? []) : [];

  const total = requests ? invitationItems.length + (tasks.data?.pages[0]?.total ?? 0) + (followUp.data?.pages[0]?.total ?? 0) + (holds.data?.pages[0]?.total ?? 0)
    : coming && tasks.data?.pages[0]?.total != null ? tasks.data.pages[0].total + (later.data?.pages[0]?.total ?? 0)
    : tasks.data?.pages[0]?.total ?? undefined;
  const shown = invitationItems.length + taskItems.length + followItems.length + holdItems.length + laterItems.length;
  const hasMore = requests ? !!tasks.hasNextPage || !followUp.isSuccess || !!followUp.hasNextPage || !holds.isSuccess || !!holds.hasNextPage : !!tasks.hasNextPage || (coming && (!later.isSuccess || !!later.hasNextPage));
  const loading = tasks.isPending;
  // Only a load with nothing to show; a failed refresh keeps the list and shows Can't connect's capsule (M90).
  const error = [tasks, followUp, invitations].find((q) => q.error && q.data === undefined)?.error;
  const retry = () => { void tasks.refetch(); void followUp.refetch(); void invitations.refetch(); };

  const loadMore = () => {
    if (tasks.hasNextPage) {
      if (!tasks.isFetchingNextPage) tasks.fetchNextPage();
    } else if (requests && followUp.hasNextPage && !followUp.isFetchingNextPage) followUp.fetchNextPage();
    else if (requests && holds.hasNextPage && !holds.isFetchingNextPage) holds.fetchNextPage();
    else if (coming && later.hasNextPage && !later.isFetchingNextPage) later.fetchNextPage();
  };

  const items: Item[] = [{ type: 'header', key: 'header' }];
  if (requests) {
    invitationItems.forEach((invitation) => items.push({ type: 'invitation', key: `v-${invitation.id}`, invitation }));
    taskItems.forEach((task) => items.push({ type: 'ask', key: `a-${task.id}`, task }));
    followItems.forEach((task) => items.push({ type: 'follow', key: `f-${task.id}`, task }));
    holdItems.forEach((task) => items.push({ type: 'hold', key: `h-${task.id}`, task }));
  } else if (section === 'overdue') taskItems.forEach((task) => items.push({ type: 'overdue', key: `o-${task.id}`, task }));
  else if (section === 'assigned') taskItems.forEach((task) => items.push({ type: 'assigned', key: `g-${task.id}`, task }));
  else if (isUndated) taskItems.forEach((task) => items.push({ type: 'undated', key: `n-${task.id}`, task }));
  else {
    let day = '';
    taskItems.forEach((task) => {
      if (section === 'coming-up' && task.dueDate && task.dueDate !== day) {
        day = task.dueDate;
        items.push({ type: 'day', key: `d-${day}`, label: labels.day(day) });
      }
      items.push({ type: 'task', key: `t-${task.id}`, task });
    });
    if (laterItems.length) {
      items.push({ type: 'day', key: 'd-later', label: t('todayList.later') });
      laterItems.forEach((task) => items.push({ type: 'task', key: `l-${task.id}`, task, due: true }));
    }
  }
  items.push({ type: 'footer', key: 'footer' });

  const title = t(`todayList.title.${section}`);
  const subtitle = t(`todayList.sub.${section}`);

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            <Text variant="title" accessibilityRole="header">{title}</Text>
            <Text variant="subhead" color="ink2">
              {total !== undefined ? `${t('todayList.items', { count: total })} · ${subtitle}` : subtitle}
            </Text>
            {error && <LoadError error={error} onRetry={retry} />}
          </View>
        );
      case 'day':
        return (
          <Text variant="label" color="ink2" accessibilityRole="header" style={{ marginTop: space.lg, marginBottom: space.xxs }}>
            {item.label}
          </Text>
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
        return <OverdueRow task={item.task} today={today!} />;
      case 'task':
        return <TaskStreamRow task={item.task} today={today!} when={item.due ? 'due' : (WHEN[section as keyof typeof WHEN] ?? 'none')} />;
      case 'assigned':
        return <AssignedRow task={item.task} today={today!} />;
      case 'undated':
        return <UndatedRow task={item.task} today={today!} />;
      case 'footer':
        return loading ? (
          <View>{[70, 55, 62].map((w) => <SkeletonRow key={w} width={w} />)}</View>
        ) : hasMore ? (
          <View style={[styles.footer, { gap: space.sm }]} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.ink3} />
            <Text variant="footnote" color="ink3">{t('todayList.loadingMore')}</Text>
          </View>
        ) : shown === 0 ? (
          <Text variant="subhead" color="ink3" style={{ paddingVertical: space.lg }}>{t('todayList.empty')}</Text>
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
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 56 },
});
