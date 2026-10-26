import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Id } from '@/core/types';
import { useTaskLists, useTeams } from '@/data/tasks/queries';
import type { TaskList } from '@/data/tasks/types';
import { BarTitle, useBarTitle } from '@/shared/components';
import { LoadError } from '@/shared/components/LoadError';
import { ColorDot, faint, Pill, Screen, Skeleton, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { useBrowseMenus } from './browseMenus';
import { useShowBrowseSheet } from '@/shared/browseSheet/browseSheetStore';
import { BrowseRow } from '@/shared/components/BrowseRow';

type Item =
  | { type: 'header'; key: string }
  | { type: 'all'; key: string }
  | { type: 'listsHead'; key: string }
  | { type: 'list'; key: string; list: TaskList }
  | { type: 'empty'; key: string }
  | { type: 'skeleton'; key: string; width: number };

/**
 * A team (M76, the hub's *Team screen*, option B; follows a list's top, M64): the title and one line, "3 lists · 4 people"
 * (the people part opens People), then All tasks and the team's lists in the user's order with + New list. Nothing but
 * GET /teams and GET /task-lists, both cached from Spaces: names load only in People. Add people beside ••• for the
 * team's owner and admins; ••• opens the team's menu by role.
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
  const showSheet = useShowBrowseSheet();
  const { teamMenu, listMenu } = useBrowseMenus();
  const manages = !!team && team.role !== 'member';
  const open = lists.reduce((n, c) => n + (c.openTasks ?? 0), 0);
  const people = () => navigation.navigate('People', { kind: 'team', id: teamId });
  const newList = () => showSheet({ kind: 'list', teamId });
  // Only a load with nothing to show; a failed refresh keeps the screen and shows Can't connect's capsule (M90).
  const error = [teams, taskLists].find((q) => q.error && q.data === undefined)?.error;
  const retry = () => { teams.refetch(); taskLists.refetch(); };

  const bar = useBarTitle();
  useLayoutEffect(() => {
    navigation.setOptions({
      // Scrolled, the bar shows the team's name over "3 lists" (M94).
      headerTitle: () => <BarTitle shown={bar.shown} title={team?.name ?? ''} line={taskLists.isPending ? undefined : lists.length ? t('browse.listCount', { count: lists.length }) : t('browse.noListsYet')} />,
      headerRight: team
        ? () => (
            <View style={styles.headerRight}>
              {manages && (
                <Pressable onPress={people} accessibilityRole="button" accessibilityLabel={t('browse.addPeople')} style={styles.more}>
                  <Feather name="user-plus" size={21} color={colors.accent} />
                </Pressable>
              )}
              <Pressable onPress={() => teamMenu(team, () => navigation.goBack(), true)} accessibilityRole="button" accessibilityLabel={t('browse.menu.title')} style={styles.more}>
                <Feather name="more-horizontal" size={22} color={colors.accent} />
              </Pressable>
            </View>
          )
        : undefined,
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
    if (!error) [62, 0, 58, 44, 66].forEach((width, i) => items.push(width ? { type: 'skeleton', key: `k${i}`, width } : { type: 'listsHead', key: 'listsHead' }));
  } else if (lists.length) {
    items.push({ type: 'all', key: 'all' }, { type: 'listsHead', key: 'listsHead' });
    lists.forEach((list) => items.push({ type: 'list', key: list.id, list }));
  } else items.push({ type: 'empty', key: 'empty' });

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.md, gap: space.xxs }}>
            {team ? (
              <>
                <Text variant="title" accessibilityRole="header" numberOfLines={2}>{team.name}</Text>
                {!taskLists.isPending && (
                  <View style={[styles.line, { gap: space.xs }]}>
                    <Text variant="subhead" color="ink3">{lists.length ? t('browse.listCount', { count: lists.length }) : t('browse.noListsYet')}</Text>
                    <Pressable onPress={people} accessibilityRole="button" style={[styles.who, { gap: space.xs }]}>
                      <Text variant="subhead" color="ink3">·</Text>
                      <Feather name="users" size={14} color={colors.ink2} />
                      <Text variant="subhead" color="ink2" numberOfLines={1} style={styles.shrink}>{team.members > 1 ? t('browse.people', { count: team.members }) : t('browse.onlyYouHere')}</Text>
                    </Pressable>
                  </View>
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
      case 'all':
        return <BrowseRow label={t('browse.allTasks')} icon={<Feather name="list" size={17} color={colors.accent} />} count={open} onPress={() => navigation.navigate('BrowseList', { kind: 'team', id: teamId, backTitle: team?.name })} />;
      case 'listsHead':
        return (
          <View style={[styles.section, { marginTop: space.xl }]}>
            <Text variant="label" color="ink2" accessibilityRole="header" style={styles.fill}>{t('browse.lists')}</Text>
            {team && (
              <Pressable onPress={newList} accessibilityRole="button" accessibilityLabel={t('browse.menu.newListIn', { name: team.name })} style={styles.add}>
                <Feather name="plus" size={20} color={colors.accent} />
              </Pressable>
            )}
          </View>
        );
      case 'list': {
        const c = item.list;
        return <BrowseRow label={c.name} icon={<ColorDot color={c.color} size={10} />} tint={faint(c.color, scheme)} count={c.openTasks ?? 0}
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
  line: { flexDirection: 'row', alignItems: 'center' },
  who: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, minHeight: 44 },
  shrink: { flexShrink: 1 },
  section: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  add: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10, marginVertical: -6 },
  empty: { alignItems: 'center' },
  center: { textAlign: 'center', maxWidth: 280 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
