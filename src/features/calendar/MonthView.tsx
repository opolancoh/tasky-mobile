import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { addMonths, monthEnd, monthOf, monthStart, monthWeeks, weekStart } from '@/core/dates/calendar';
import { addDays } from '@/core/dates/localDate';
import type { LocalDate } from '@/core/types';
import { useCompleteTask } from '@/data/tasks/mutations';
import { useTaskPages } from '@/data/tasks/queries';
import type { TaskSummary } from '@/data/tasks/types';
import { LoadError } from '@/shared/components/LoadError';
import { TaskRow } from '@/shared/components';
import { useQuickAdd } from '@/shared/quickAdd/quickAddStore';
import { chooseAction, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { useCalendarView } from './calendarViewStore';
import { CalendarHeader } from './components/CalendarHeader';
import { DayHeading } from './components/DayHeading';
import { MonthGrid } from './components/MonthGrid';
import { OverdueChip } from './components/OverdueChip';
import { useCalendarLabels } from './useCalendarLabels';
import { useOverdue } from './useOverdue';

/** The most GET /tasks returns at once: a month's tasks usually come in one page. */
const RANGE_PAGE = 200;

type Item =
  | { type: 'header'; key: string }
  | { type: 'nav'; key: string }
  | { type: 'grid'; key: string }
  | { type: 'chips'; key: string }
  | { type: 'overdueHead'; key: string; title: string; count: number; foldable: boolean }
  | { type: 'day'; key: string; date: LocalDate }
  | { type: 'task'; key: string; task: TaskSummary; showDue: boolean }
  | { type: 'empty'; key: string }
  | { type: 'skeleton'; key: string; width: number }
  | { type: 'more'; key: string }
  | { type: 'footer'; key: string };

/** The picked day, or the chip's overdue tasks in its place. */
type Picked = LocalDate | 'overdue';

/**
 * Calendar, the Calendar tab's calendar view (M72, M99): a month (or a week, from the title's menu) with dots in the tasks'
 * list colors. The line under "Calendar" counts the range on screen and its overdue tasks; a chip holds the overdue ones
 * outside it ("Earlier"). Under the grid, every day of the range with tasks as the List view draws it (the current month
 * from today, its overdue on top and folding), a + on each day for Quick add due that day; tapping a day in the grid scrolls to it.
 * ‹ › move a month or a week; Today shows once another day is picked or today is off screen. Only dated tasks. Every open
 * task in the range, every page (GET /tasks?dueFrom=&dueTo=): the dots need them all, and the list draws from the same data.
 */
export function MonthView({ today }: { today: LocalDate }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const labels = useCalendarLabels(today);
  const complete = useCompleteTask();
  const quickAdd = useQuickAdd((s) => s.show);
  const list = useRef<FlashListRef<Item>>(null);
  const [day, setDay] = useState<Picked>(today);
  const [anchor, setAnchor] = useState<LocalDate>(today);
  const overdue = useOverdue(day === 'overdue');
  // Month or Week, kept on the device (calendarViewStore); the day and the month or week on screen start at today.
  const week = useCalendarView((s) => s.mode) === 'week';
  const setMode = useCalendarView((s) => s.setMode);
  const overdueFolded = useCalendarView((s) => s.overdueFolded);
  const setOverdueFolded = useCalendarView((s) => s.setOverdueFolded);
  const [refreshing, setRefreshing] = useState(false);

  const from = week ? weekStart(anchor) : monthStart(anchor);
  const to = week ? addDays(from, 6) : monthEnd(anchor);
  const pages = useTaskPages({ dueFrom: from, dueTo: to, sort: 'due', limit: RANGE_PAGE });
  // The dots need the whole range: load the rest of the pages (rare past 200 tasks).
  useEffect(() => {
    if (pages.hasNextPage && !pages.isFetchingNextPage) pages.fetchNextPage();
  }, [pages]);

  // The range's tasks by day, soonest first as the API sends them; its overdue ones (before today) apart.
  const inRange = pages.data?.pages.flatMap((p) => p.items) ?? [];
  const byDay = new Map<LocalDate, TaskSummary[]>();
  inRange.forEach((task) => task.dueDate && byDay.set(task.dueDate, [...(byDay.get(task.dueDate) ?? []), task]));
  const overIn = inRange.filter((task) => !!task.dueDate && task.dueDate < today);
  // The chip: overdue tasks outside the range ("Earlier" when the range holds today or is ahead of it).
  const outside = Math.max(0, overdue.count - overIn.length);
  const outsideTasks = overdue.tasks.filter((task) => !!task.dueDate && (task.dueDate < from || task.dueDate > to));
  const chipLabel = t(to < today ? 'calendar.otherOverdue' : 'calendar.earlier');

  const holdsToday = from <= today && today <= to;
  const showToday = day !== today || !holdsToday;
  // The picked day when the range moves: today if it's on screen, else the range's first day.
  const landOn = (start: LocalDate, end: LocalDate) => (start <= today && today <= end ? today : start);

  const loading = (day === 'overdue' ? overdue.pages : pages).isPending;
  const items: Item[] = [{ type: 'header', key: 'header' }, { type: 'nav', key: 'nav' }, { type: 'grid', key: 'grid' }, { type: 'chips', key: 'chips' }];
  if (loading) [70, 55, 62].forEach((width, i) => items.push({ type: 'skeleton', key: `k-${i}`, width }));
  else if (day === 'overdue') {
    items.push({ type: 'overdueHead', key: 'outside-head', title: chipLabel, count: outside, foldable: false });
    outsideTasks.forEach((task) => items.push({ type: 'task', key: `o-${task.id}`, task, showDue: true }));
    if (overdue.pages.hasNextPage) items.push({ type: 'more', key: 'more' });
  } else {
    if (overIn.length) {
      // The range's overdue tasks fold under their heading (M99), the fold kept on the device.
      items.push({ type: 'overdueHead', key: 'over-head', title: t('calendar.overdue'), count: overIn.length, foldable: true });
      if (!overdueFolded) overIn.forEach((task) => items.push({ type: 'task', key: `o-${task.id}`, task, showDue: true }));
    }
    byDay.forEach((dayTasks, date) => {
      if (date < today) return;
      items.push({ type: 'day', key: `d-${date}`, date });
      dayTasks.forEach((task) => items.push({ type: 'task', key: task.id, task, showDue: false }));
    });
    if (items.length === 4 && !(pages.error && !pages.data)) items.push({ type: 'empty', key: 'empty' });
  }
  items.push({ type: 'footer', key: 'footer' });

  const move = (n: number) => {
    const next = week ? addDays(anchor, 7 * n) : addMonths(anchor, n);
    setAnchor(next);
    if (day === 'overdue') return;
    const start = week ? weekStart(next) : monthStart(next);
    setDay(landOn(start, week ? addDays(start, 6) : monthEnd(next)));
  };
  // A day in the grid scrolls the list to it (a past one to the range's Overdue); a day with nothing due is only picked.
  const pick = (date: LocalDate) => {
    setDay(date);
    setAnchor(date);
    if (date < today) setOverdueFolded(false);   // a past day opens Overdue, where its tasks are
    const index = items.findIndex((item) => item.key === (date < today ? 'over-head' : `d-${date}`));
    if (day !== 'overdue' && index >= 0) list.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
  };
  const toggleOverdue = () => setDay(day === 'overdue' ? landOn(from, to) : 'overdue');
  const goToday = () => pick(today);
  const chooseMode = async () => {
    const i = await chooseAction({
      title: t('calendar.mode.title'),
      actions: [
        { label: t('calendar.mode.month'), icon: 'calendar', selected: !week },
        { label: t('calendar.mode.week'), icon: 'columns', selected: week },
      ],
      cancelLabel: t('common.cancel'),
    });
    if (i === null) return;
    setMode(i === 1 ? 'week' : 'month');
    setAnchor(day === 'overdue' ? today : day);
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([pages.refetch(), overdue.refetch()]);
    setRefreshing(false);
  };
  const open = (task: TaskSummary) => navigation.navigate('TaskDetail', { taskId: task.id });
  const title = week ? labels.week(from) : labels.month(anchor);

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return <CalendarHeader count={pages.data ? inRange.length : undefined} overdue={overIn.length} />;
      case 'nav':
        return (
          <View style={[styles.nav, { gap: space.xs, marginTop: space.md, marginBottom: space.sm }]}>
            <Pressable onPress={chooseMode} accessibilityRole="button" accessibilityLabel={t('calendar.mode.open', { title })} hitSlop={6} style={[styles.title, { gap: space.xxs }]}>
              <Text variant="headline" numberOfLines={1}>{title}</Text>
              <Feather name="chevron-down" size={16} color={colors.accent} />
            </Pressable>
            <View style={styles.fill} />
            {showToday && (
              <Pressable onPress={goToday} accessibilityRole="button" style={({ pressed }) => [styles.today, { backgroundColor: colors.accentSoft, paddingHorizontal: space.md, marginRight: space.xs, opacity: pressed ? 0.7 : 1 }]}>
                <Text variant="label" color="accent">{t('dates.today')}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel={t(week ? 'calendar.previousWeek' : 'calendar.previousMonth')} style={styles.arrow}>
              <Feather name="chevron-left" size={20} color={colors.accent} />
            </Pressable>
            <Pressable onPress={() => move(1)} accessibilityRole="button" accessibilityLabel={t(week ? 'calendar.nextWeek' : 'calendar.nextMonth')} style={styles.arrow}>
              <Feather name="chevron-right" size={20} color={colors.accent} />
            </Pressable>
          </View>
        );
      case 'grid':
        return (
          <View>
            <MonthGrid weeks={week ? [from] : monthWeeks(anchor)} month={week ? undefined : monthOf(anchor)} today={today} picked={day === 'overdue' ? null : day} byDay={byDay} onPick={pick} />
            {pages.error && !pages.data && <LoadError error={pages.error} onRetry={() => void pages.refetch()} />}
          </View>
        );
      case 'chips':
        return <OverdueChip count={outside} label={chipLabel} open={day === 'overdue'} onPress={toggleOverdue} />;
      case 'overdueHead':
        return item.foldable ? (
          <Pressable
            onPress={() => setOverdueFolded(!overdueFolded)}
            accessibilityRole="button"
            accessibilityState={{ expanded: !overdueFolded }}
            hitSlop={8}
            style={[styles.row, { gap: space.xs, marginTop: space.lg }]}
          >
            <Text variant="label" color="danger" accessibilityRole="header">{item.title}</Text>
            <Feather name={overdueFolded ? 'chevron-right' : 'chevron-down'} size={14} color={colors.ink3} />
            <Text variant="label" color="ink3">{item.count}</Text>
          </Pressable>
        ) : (
          <View style={[styles.row, { gap: space.sm, marginTop: space.lg }]}>
            <Text variant="label" color="danger" accessibilityRole="header">{item.title}</Text>
            <Text variant="label" color="ink3">{item.count}</Text>
          </View>
        );
      case 'day':
        return (
          <DayHeading
            date={item.date}
            weekday={labels.weekday(item.date)}
            under={labels.under(item.date)}
            isToday={item.date === today}
            onAdd={() => quickAdd({ dueDate: item.date })}
            addLabel={t('calendar.addOn', { date: labels.day(item.date) })}
          />
        );
      case 'task':
        return <TaskRow task={item.task} today={today} showDue={item.showDue} onComplete={(task) => complete.mutate(task)} onPress={open} />;
      case 'empty':
        return <Text variant="subhead" color="ink3" style={{ paddingVertical: space.md }}>{t('calendar.rangeFree')}</Text>;
      case 'skeleton':
        return <SkeletonRow width={item.width} />;
      case 'more':
        return <View style={styles.footer}><ActivityIndicator color={colors.ink3} /></View>;
      case 'footer':
        return <View style={{ height: space.xl }} />;
    }
  };

  return (
    <FlashList
      ref={list}
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.key}
      getItemType={(item) => item.type}
      onEndReached={() => day === 'overdue' && overdue.pages.hasNextPage && !overdue.pages.isFetchingNextPage && overdue.pages.fetchNextPage()}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink3} />}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center' },
  title: { flexDirection: 'row', alignItems: 'center', minHeight: 44, flexShrink: 1 },
  today: { height: 30, borderRadius: 15, justifyContent: 'center' },
  arrow: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 56 },
});
