import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { formatLocalDate, nowIn } from '@/core/dates/localDate';
import type { Notification } from '@/data/collaboration/types';
import { useUnreadCount, useUnreadNotifications } from '@/data/collaboration/queries';
import { HOME_PREVIEW, useHome } from '@/data/tasks/queries';
import type { MyInvitation, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { useSession } from '@/shared/session/SessionProvider';
import { Button, Notice, Pill, radius, Screen, Skeleton, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { AskRow, InvitationRow, OverdueRow, TaskStreamRow, UpdateRow } from './components/StreamRows';
import type { HomeListSection } from './homeSections';

/** Home's rows, one list (FlashList) so long sections stay fast (docs/performance.md). */
type Item =
  | { type: 'header'; key: string }
  | { type: 'section'; key: string; title: string; count: number; seeAll?: HomeListSection }
  | { type: 'invitation'; key: string; invitation: MyInvitation }
  | { type: 'ask'; key: string; task: TaskSummary }
  | { type: 'overdue'; key: string; task: TaskSummary }
  | { type: 'task'; key: string; task: TaskSummary; when: 'time' | 'day' }
  | { type: 'update'; key: string; notification: Notification }
  | { type: 'shared'; key: string; count: number }
  | { type: 'calm'; key: string; body: string }
  | { type: 'signOut'; key: string }
  | { type: 'skeletonSection'; key: string }
  | { type: 'skeletonRow'; key: string; width: number };

/**
 * Home, "my pending stuff" (06-mobile.md, M32–M35): one stream by urgency. Needs attention (invitations, assignments
 * to answer, overdue), Today (due today or a reminder today), Coming up (next 7 days), Updates (unread notifications),
 * each with its count, its first 5 rows and See all; chips for Important and the Inbox. Data: GET /home (D67) beside
 * the unread notifications; every count opens its list (HomeList, M33).
 */
export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const { signOut } = useSession();
  const me = useMe().data;
  const home = useHome();
  const updates = useUnreadNotifications(HOME_PREVIEW);
  const unread = useUnreadCount();
  const [refreshing, setRefreshing] = useState(false);

  const now = me ? nowIn(me.timeZone) : undefined;
  const today = now?.date;
  const data = home.data;
  const seeAll = (section: HomeListSection) => navigation.navigate('HomeList', { section });

  const attentionCount = data ? data.invitations.length + (data.toAnswer.total ?? 0) + (data.overdue.total ?? 0) : 0;
  const todayCount = data?.today.total ?? 0;
  const unreadCount = unread.data?.count ?? updates.data?.items.length ?? 0;

  const items: Item[] = [{ type: 'header', key: 'header' }];
  // First load (M27): skeleton sections and rows where the sections will be.
  if (!data && home.isPending) {
    items.push({ type: 'skeletonSection', key: 'ks1' }, ...[72, 55, 64].map((width, i) => ({ type: 'skeletonRow' as const, key: `kr1-${i}`, width })));
    items.push({ type: 'skeletonSection', key: 'ks2' }, ...[48, 60].map((width, i) => ({ type: 'skeletonRow' as const, key: `kr2-${i}`, width })));
  }

  if (data && today) {
    if (!attentionCount && !todayCount) items.push({ type: 'calm', key: 'calm', body: t(data.comingUp.total ? 'home.caughtUpNext' : 'home.caughtUpBody') });

    // Needs attention: invitations, then answers, then overdue; 5 rows at most, See all for the rest.
    if (attentionCount) {
      items.push({ type: 'section', key: 's-attention', title: t('home.attention'), count: attentionCount, seeAll: attentionCount > HOME_PREVIEW ? 'attention' : undefined });
      const rows: Item[] = [
        ...data.invitations.map((invitation) => ({ type: 'invitation' as const, key: `v-${invitation.id}`, invitation })),
        ...data.toAnswer.items.map((task) => ({ type: 'ask' as const, key: `a-${task.id}`, task })),
        ...data.overdue.items.map((task) => ({ type: 'overdue' as const, key: `o-${task.id}`, task })),
      ];
      items.push(...rows.slice(0, HOME_PREVIEW));
    }

    if (todayCount) {
      items.push({ type: 'section', key: 's-today', title: t('home.today'), count: todayCount, seeAll: todayCount > HOME_PREVIEW ? 'today' : undefined });
      data.today.items.forEach((task) => items.push({ type: 'task', key: `t-${task.id}`, task, when: 'time' }));
    }
    if (data.sharedTotal) items.push({ type: 'shared', key: 'shared', count: data.sharedTotal });

    const coming = data.comingUp.total ?? 0;
    if (coming) {
      items.push({ type: 'section', key: 's-coming', title: t('home.comingUp'), count: coming, seeAll: coming > HOME_PREVIEW ? 'coming-up' : undefined });
      data.comingUp.items.forEach((task) => items.push({ type: 'task', key: `c-${task.id}`, task, when: 'day' }));
    }

    if (unreadCount && updates.data?.items.length) {
      items.push({ type: 'section', key: 's-updates', title: t('home.updates'), count: unreadCount, seeAll: unreadCount > HOME_PREVIEW ? 'updates' : undefined });
      updates.data.items.forEach((notification) => items.push({ type: 'update', key: `u-${notification.id}`, notification }));
    }
  }
  items.push({ type: 'signOut', key: 'signOut' });   // until Settings exists

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([home.refetch(), updates.refetch(), unread.refetch()]);
    setRefreshing(false);
  };

  const summary = [
    attentionCount > 0 && t('home.needAttention', { count: attentionCount }),
    t('home.forToday', { count: todayCount }),
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
            {data ? (
              <Text variant="subhead" color="ink2">
                {summary}
              </Text>
            ) : (
              <View accessible accessibilityLabel={t('home.loading')} style={{ paddingTop: space.xs }}>
                <Skeleton width={150} height={12} />
              </View>
            )}
            {/* Important and the Inbox: a count each, opening its list (M32, M33). */}
            {data && (data.importantTotal > 0 || data.inboxTotal > 0) && (
              <View style={[styles.chips, { gap: space.sm, marginTop: space.sm }]}>
                {data.importantTotal > 0 && (
                  <Pill tone="danger" icon={<Feather name="flag" size={13} color={colors.danger} />} label={t('home.importantCount', { count: data.importantTotal })} onPress={() => seeAll('important')} />
                )}
                {data.inboxTotal > 0 && (
                  <Pill icon={<Feather name="inbox" size={13} color={colors.accent} />} label={t('home.toSort', { count: data.inboxTotal })} onPress={() => seeAll('inbox')} />
                )}
              </View>
            )}
            {home.error && (
              <View style={{ marginTop: space.md }}>
                <Notice>{errorMessage(home.error)}</Notice>
              </View>
            )}
          </View>
        );
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
                <Button variant="link" title={t('home.seeAll')} onPress={() => seeAll(item.seeAll!)} />
              </View>
            )}
          </View>
        );
      case 'invitation':
        return <InvitationRow invitation={item.invitation} />;
      case 'ask':
        return <AskRow task={item.task} today={today!} />;
      case 'overdue':
        return <OverdueRow task={item.task} today={today!} />;
      case 'task':
        return <TaskStreamRow task={item.task} today={today!} when={item.when} />;
      case 'update':
        return <UpdateRow notification={item.notification} />;
      case 'shared':
        return (
          <Pressable onPress={() => seeAll('shared')} accessibilityRole="button">
            {({ pressed }) => (
              <View style={[styles.line, { gap: space.sm, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
                <Text variant="subhead" color="ink2" style={styles.fill} numberOfLines={1}>
                  {t('home.shared', { count: item.count })}
                </Text>
                <Feather name="chevron-right" size={18} color={colors.ink3} />
              </View>
            )}
          </Pressable>
        );
      case 'calm':
        return (
          <View style={[styles.calm, { backgroundColor: colors.surface2, padding: space.md, gap: space.md, marginTop: space.xs }]}>
            <View style={[styles.calmIcon, { backgroundColor: colors.successSoft }]}>
              <Feather name="check" size={18} color={colors.success} />
            </View>
            <View style={styles.fill}>
              <Text variant="bodyMedium">{t('home.caughtUp')}</Text>
              <Text variant="footnote" color="ink2" numberOfLines={2}>
                {item.body}
              </Text>
            </View>
          </View>
        );
      case 'skeletonSection':
        return <Skeleton width={92} height={12} style={{ marginTop: space.xl + space.xs, marginBottom: space.xs }} />;
      case 'skeletonRow':
        return <SkeletonRow width={item.width} />;
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
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  push: { marginLeft: 'auto' },
  line: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  calm: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg },
  calmIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
