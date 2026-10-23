import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';

import { monthOf, weekStart } from '@/core/dates/calendar';
import type { LocalDate } from '@/core/types';
import { useCompleteTask } from '@/data/tasks/mutations';
import { useTaskPages } from '@/data/tasks/queries';
import type { TaskSummary } from '@/data/tasks/types';
import { LoadError } from '@/shared/components/LoadError';
import { TaskRow } from '@/shared/components';
import { Button, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { CalendarHeader } from './components/CalendarHeader';
import { DayHeading } from './components/DayHeading';
import { OverdueChip } from './components/OverdueChip';
import { useCalendarLabels } from './useCalendarLabels';
import { useOverdue } from './useOverdue';

const PAGE = 50;

type Item =
  | { type: 'header'; key: string }
  | { type: 'chips'; key: string }
  | { type: 'overdueHead'; key: string }
  | { type: 'overdueMore'; key: string }
  | { type: 'month'; key: string; title: string }
  | { type: 'week'; key: string; title: string }
  | { type: 'day'; key: string; date: LocalDate }
  | { type: 'task'; key: string; task: TaskSummary }
  | { type: 'free'; key: string }
  | { type: 'skeleton'; key: string; width: number }
  | { type: 'footer'; key: string };

/**
 * List, the Calendar tab's list view (M72): one scroll from today, like Things' Upcoming. Each day with tasks, and today,
 * under a large day number, then its tasks as the usual rows full width; month headings and a thin week line ("Oct 5 – 11")
 * at each new week; free days skipped. A page at a time from today (GET /tasks?dueFrom=<today>&sort=due). Overdue as a
 * chip on top; tapping it lists its tasks over the scroll, tapping again closes it. Only dated tasks.
 */
export function DaysView({ today }: { today: LocalDate }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const labels = useCalendarLabels(today);
  const complete = useCompleteTask();
  const [overdueOpen, setOverdueOpen] = useState(false);
  const overdue = useOverdue(overdueOpen);
  const [refreshing, setRefreshing] = useState(false);
  const pages = useTaskPages({ dueFrom: today, sort: 'due', limit: PAGE });
  const tasks = pages.data?.pages.flatMap((p) => p.items) ?? [];

  const items: Item[] = [{ type: 'header', key: 'header' }, { type: 'chips', key: 'chips' }];
  if (overdueOpen) {
    items.push({ type: 'overdueHead', key: 'overdue-head' });
    if (overdue.pages.isPending) [70, 55].forEach((width, i) => items.push({ type: 'skeleton', key: `ok-${i}`, width }));   // loaded on opening
    overdue.tasks.forEach((task) => items.push({ type: 'task', key: `o-${task.id}`, task }));
    if (overdue.pages.hasNextPage) items.push({ type: 'overdueMore', key: 'overdue-more' });
  }

  if (pages.isPending) {
    items.push({ type: 'month', key: `m-${monthOf(today)}`, title: labels.month(today) }, { type: 'day', key: `d-${today}`, date: today });
    [70, 55, 62].forEach((width, i) => items.push({ type: 'skeleton', key: `k-${i}`, width }));
  } else {
    // Today always; then each day with tasks (soonest first, as the API sends them), a month heading and a week line as they change.
    const byDay = new Map<LocalDate, TaskSummary[]>([[today, []]]);
    tasks.forEach((task) => task.dueDate && byDay.set(task.dueDate, [...(byDay.get(task.dueDate) ?? []), task]));
    let month = '', week = weekStart(today);
    byDay.forEach((dayTasks, date) => {
      if (monthOf(date) !== month) {
        month = monthOf(date);
        items.push({ type: 'month', key: `m-${month}`, title: labels.month(date) });
      }
      if (weekStart(date) !== week) {
        week = weekStart(date);
        items.push({ type: 'week', key: `w-${week}`, title: labels.week(week) });
      }
      items.push({ type: 'day', key: `d-${date}`, date });
      if (!dayTasks.length) items.push({ type: 'free', key: 'free' });
      dayTasks.forEach((task) => items.push({ type: 'task', key: task.id, task }));
    });
  }
  items.push({ type: 'footer', key: 'footer' });

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([pages.refetch(), overdue.refetch()]);
    setRefreshing(false);
  };
  const open = (task: TaskSummary) => navigation.navigate('TaskDetail', { taskId: task.id });

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View>
            <CalendarHeader overdue={overdue.count} />
            {pages.error && !pages.data && <LoadError error={pages.error} onRetry={() => void pages.refetch()} />}
          </View>
        );
      case 'chips':
        return <OverdueChip count={overdue.count} open={overdueOpen} onPress={() => setOverdueOpen(!overdueOpen)} />;
      case 'overdueHead':
        return (
          <View style={[styles.row, { gap: space.sm, marginTop: space.md }]}>
            <Text variant="label" color="danger" accessibilityRole="header">{t('calendar.overdue')}</Text>
            <Text variant="label" color="ink3">{overdue.count}</Text>
          </View>
        );
      case 'overdueMore':
        return (
          <View style={styles.footer}>
            {overdue.pages.isFetchingNextPage
              ? <ActivityIndicator color={colors.ink3} />
              : <Button variant="link" title={t('calendar.showMore')} onPress={() => overdue.pages.fetchNextPage()} />}
          </View>
        );
      case 'month':
        return <Text variant="title" accessibilityRole="header" style={{ fontSize: 20, lineHeight: 26, marginTop: space.xl }}>{item.title}</Text>;
      case 'week':
        return <Text variant="caption" color="ink3" style={{ marginTop: space.md, marginLeft: space.xxs }}>{item.title}</Text>;
      case 'day':
        return <DayHeading date={item.date} weekday={labels.weekday(item.date)} under={labels.under(item.date)} isToday={item.date === today} />;
      case 'task':
        return <TaskRow task={item.task} today={today} showDue={item.key.startsWith('o-')} onComplete={(task) => complete.mutate(task)} onPress={open} />;
      case 'free':
        return <Text variant="subhead" color="ink3" style={{ paddingVertical: space.sm }}>{t('calendar.nothingToday')}</Text>;
      case 'skeleton':
        return <SkeletonRow width={item.width} />;
      case 'footer':
        return pages.hasNextPage ? <View style={styles.footer}><ActivityIndicator color={colors.ink3} /></View> : <View style={{ height: space.xl }} />;
    }
  };

  return (
    <FlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.key}
      getItemType={(item) => item.type}
      onEndReached={() => pages.hasNextPage && !pages.isFetchingNextPage && pages.fetchNextPage()}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink3} />}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 56 },
});
