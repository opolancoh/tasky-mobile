import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { todayIn } from '@/core/dates/localDate';
import { useMyReminderPages, useTaskLists } from '@/data/tasks/queries';
import type { MyReminder } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { ReminderIcon } from '@/shared/components';
import { LoadError } from '@/shared/components/LoadError';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { Screen, SkeletonRow, Text, useTheme } from '@/shared/ui';

type Item =
  | { type: 'header'; key: string }
  | { type: 'day'; key: string; label: string }
  | { type: 'reminder'; key: string; reminder: MyReminder }
  | { type: 'footer'; key: string };

/**
 * Home › Reminders (06-mobile.md, M105): every upcoming reminder of the user's on an open task, soonest first, under a
 * heading per day (Today, Tomorrow, then the date); no cutoff (Home counts the next 7 days). Each row: the time, the task,
 * its list; it opens the task. 20 at a time as the list scrolls (GET /me/reminders, keyset).
 */
export function RemindersScreen() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const labels = useDateLabels(today);
  const pages = useMyReminderPages();
  const lists = new Map((useTaskLists().data ?? []).map((c) => [c.id, c]));
  const reminders = pages.data?.pages.flatMap((p) => p.items) ?? [];

  const items: Item[] = [{ type: 'header', key: 'header' }];
  let day = '';
  reminders.forEach((reminder) => {
    if (reminder.date !== day) {
      day = reminder.date;
      items.push({ type: 'day', key: `d-${day}`, label: labels.day(day) });
    }
    items.push({ type: 'reminder', key: `r-${reminder.taskId}-${reminder.date}-${reminder.time}`, reminder });
  });
  items.push({ type: 'footer', key: 'footer' });

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.sm, gap: space.xxs }}>
            <Text variant="title" accessibilityRole="header">{t('home.reminders')}</Text>
            <Text variant="subhead" color="ink2">{t('reminders.listSub')}</Text>
            {pages.error && !pages.data && <LoadError error={pages.error} onRetry={() => void pages.refetch()} />}
          </View>
        );
      case 'day':
        return <Text variant="label" color="ink2" accessibilityRole="header" style={{ marginTop: space.lg, marginBottom: space.xxs }}>{item.label}</Text>;
      case 'reminder': {
        const r = item.reminder, list = lists.get(r.taskListId);
        const where = list ? (list.isInbox ? t('browse.inbox') : list.name) : '';
        return (
          <Pressable onPress={() => navigation.navigate('TaskDetail', { taskId: r.taskId })} accessibilityRole="button">
            {({ pressed }) => (
              <View style={[styles.row, { gap: space.md, paddingVertical: space.sm + 2, borderBottomColor: colors.line, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
                <View style={[styles.tile, { backgroundColor: colors.warnSoft }]}>
                  <ReminderIcon size={16} color={colors.warn} />
                </View>
                <View style={styles.main}>
                  <Text variant="bodyMedium" numberOfLines={1}>{r.title}</Text>
                  <Text variant="footnote" color="ink3" numberOfLines={1}>
                    <Text variant="footnote" color="accent">{labels.time(r.time)}</Text>
                    {where ? ` · ${where}` : ''}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        );
      }
      case 'footer':
        return pages.isPending ? (
          <View>{[70, 55, 62].map((w) => <SkeletonRow key={w} width={w} />)}</View>
        ) : pages.hasNextPage ? (
          <View style={styles.footer}><ActivityIndicator color={colors.ink3} /></View>
        ) : !reminders.length ? (
          <Text variant="subhead" color="ink3" style={{ paddingVertical: space.lg }}>{t('reminders.listEmpty')}</Text>
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
        onEndReached={() => pages.hasNextPage && !pages.isFetchingNextPage && pages.fetchNextPage()}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  tile: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, minWidth: 0, gap: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 56 },
});
