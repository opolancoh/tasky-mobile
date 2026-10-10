import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { addDays, todayIn } from '@/core/dates/localDate';
import type { Notification } from '@/data/collaboration/types';
import { useMarkRead } from '@/data/collaboration/mutations';
import { useNotifications } from '@/data/collaboration/queries';
import { HOME_PAGE, useHomeSection, useInvitations, useTaskPages } from '@/data/tasks/queries';
import type { HomeSection, MyInvitation, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { errorMessage } from '@/shared/i18n/errors';
import { Notice, Screen, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { AskRow, InvitationRow, OverdueRow, TaskStreamRow, UpdateRow } from './components/StreamRows';
import type { TodayListSection } from './todaySections';

type Item =
  | { type: 'header'; key: string }
  | { type: 'day'; key: string; label: string }
  | { type: 'invitation'; key: string; invitation: MyInvitation }
  | { type: 'ask'; key: string; task: TaskSummary }
  | { type: 'overdue'; key: string; task: TaskSummary }
  | { type: 'task'; key: string; task: TaskSummary; due?: boolean }
  | { type: 'update'; key: string; notification: Notification }
  | { type: 'footer'; key: string };

/** The task section behind each See all (D67); Needs attention pages its answers, then its overdue tasks. */
const TASK_SECTION: Partial<Record<TodayListSection, HomeSection>> = {
  today: 'today', 'coming-up': 'coming-up', important: 'important', inbox: 'inbox',
};
const WHEN = { today: 'time', 'coming-up': 'none', important: 'due', inbox: 'none' } as const;

/**
 * See all (06-mobile.md, M33): a whole Today section on its own screen, pushed from its See all or a chip. Title, total and what it holds; the same rows as Home (Coming up under day headings); 20 at a time, the next
 * page as the list nears its end (keyset cursor), "All N shown" at the end.
 */
export function TodayListScreen({ route }: StaticScreenProps<{ section: TodayListSection }>) {
  const { section } = route.params;
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const labels = useDateLabels(today);
  const markRead = useMarkRead();

  const attention = section === 'attention';
  const tasks = useHomeSection(TASK_SECTION[section] ?? 'to-answer', !!TASK_SECTION[section] || attention);
  const toAnswerDone = attention && tasks.isSuccess && !tasks.hasNextPage;
  const overdue = useHomeSection('overdue', toAnswerDone);
  // Coming up's See all ends with Later: due after the next 7 days (M39), once the 7 days are all loaded.
  const coming = section === 'coming-up';
  const later = useTaskPages({ due: ['upcoming'], dueFrom: today ? addDays(today, 8) : undefined, sort: 'due', limit: HOME_PAGE }, coming && !!today && tasks.isSuccess && !tasks.hasNextPage);
  const laterItems = coming ? (later.data?.pages.flatMap((p) => p.items) ?? []) : [];
  const isUpdates = section === 'updates';
  const invitations = useInvitations(attention);
  const updates = useNotifications(HOME_PAGE, isUpdates);

  const taskItems = tasks.data?.pages.flatMap((p) => p.items) ?? [];
  const overdueItems = overdue.data?.pages.flatMap((p) => p.items) ?? [];
  const notifications = isUpdates ? (updates.data?.pages.flatMap((p) => p.items) ?? []) : [];
  const invitationItems = attention ? (invitations.data ?? []) : [];

  const total = isUpdates ? undefined
    : attention ? invitationItems.length + (tasks.data?.pages[0]?.total ?? 0) + (overdue.data?.pages[0]?.total ?? 0)
    : coming && tasks.data?.pages[0]?.total != null ? tasks.data.pages[0].total + (later.data?.pages[0]?.total ?? 0)
    : tasks.data?.pages[0]?.total ?? undefined;
  const shown = isUpdates ? notifications.length : invitationItems.length + taskItems.length + overdueItems.length + laterItems.length;
  const hasMore = isUpdates ? !!updates.hasNextPage : attention ? !!tasks.hasNextPage || !toAnswerDone || !!overdue.hasNextPage : !!tasks.hasNextPage || (coming && (!later.isSuccess || !!later.hasNextPage));
  const loading = isUpdates ? updates.isPending : tasks.isPending;
  const error = isUpdates ? updates.error : (tasks.error ?? overdue.error ?? invitations.error);

  const loadMore = () => {
    if (isUpdates) {
      if (updates.hasNextPage && !updates.isFetchingNextPage) updates.fetchNextPage();
    } else if (tasks.hasNextPage) {
      if (!tasks.isFetchingNextPage) tasks.fetchNextPage();
    } else if (attention && overdue.hasNextPage && !overdue.isFetchingNextPage) overdue.fetchNextPage();
    else if (coming && later.hasNextPage && !later.isFetchingNextPage) later.fetchNextPage();
  };

  // Updates: Mark all read in the header.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isUpdates && notifications.some((n) => !n.readAt)
        ? () => (
            <Pressable onPress={() => markRead.mutate('all')} hitSlop={8} accessibilityRole="button" style={styles.headerButton}>
              <Text variant="button" color="accent">{t('todayList.markAllRead')}</Text>
            </Pressable>
          )
        : undefined,
    });
  });

  const items: Item[] = [{ type: 'header', key: 'header' }];
  if (isUpdates) notifications.forEach((notification) => items.push({ type: 'update', key: `u-${notification.id}`, notification }));
  else if (attention) {
    invitationItems.forEach((invitation) => items.push({ type: 'invitation', key: `v-${invitation.id}`, invitation }));
    taskItems.forEach((task) => items.push({ type: 'ask', key: `a-${task.id}`, task }));
    overdueItems.forEach((task) => items.push({ type: 'overdue', key: `o-${task.id}`, task }));
  } else {
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
              {total !== undefined ? `${t(isUpdates ? 'todayList.updates' : 'todayList.items', { count: total })} · ${subtitle}` : subtitle}
            </Text>
            {error && (
              <View style={{ marginTop: space.md }}>
                <Notice>{errorMessage(error)}</Notice>
              </View>
            )}
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
      case 'overdue':
        return <OverdueRow task={item.task} today={today!} />;
      case 'task':
        return <TaskStreamRow task={item.task} today={today!} when={item.due ? 'due' : (WHEN[section as keyof typeof WHEN] ?? 'none')} />;
      case 'update':
        return <UpdateRow notification={item.notification} />;
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
  headerButton: { minHeight: 44, justifyContent: 'center' },
});
