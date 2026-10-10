import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Id } from '@/core/types';
import { useCollections, useMembers, useTeams } from '@/data/tasks/queries';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { ColorDot, faint, ListRow, Notice, Screen, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { useBrowseMenus } from './browseMenus';
import { useShowBrowseSheet } from './browseSheetStore';
import { BrowseRow } from './components/BrowseRow';
import { Avatar } from './components/Faces';

/** People shown on the team page before All people. */
const PEOPLE_PREVIEW = 3;

/**
 * A team (M38, option A): All tasks (its count opens them), its lists in the user's order with + New list, and its
 * people (the first 3, then All people). ••• in the header has the team's menu by role.
 */
export function TeamScreen({ route }: StaticScreenProps<{ teamId: Id }>) {
  const { teamId } = route.params;
  const { t } = useTranslation();
  const { colors, space, scheme } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const teams = useTeams();
  const team = teams.data?.find((x) => x.id === teamId);
  const lists = (useCollections().data ?? []).filter((c) => c.team?.id === teamId);
  const members = useMembers({ kind: 'team', id: teamId });
  const showSheet = useShowBrowseSheet();
  const { teamMenu, listMenu } = useBrowseMenus();
  const open = lists.reduce((n, c) => n + (c.openTasks ?? 0), 0);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: team
        ? () => (
            <Pressable onPress={() => teamMenu(team, () => navigation.goBack())} accessibilityRole="button" accessibilityLabel={t('browse.menu.title')} style={styles.more}>
              <Feather name="more-horizontal" size={22} color={colors.accent} />
            </Pressable>
          )
        : undefined,
    });
  });

  if (!team) {
    return (
      <Screen edges={['bottom']}>
        {teams.error ? <Notice>{errorMessage(teams.error)}</Notice> : teams.data ? <Text variant="subhead" color="ink2">{t('browse.teamGone')}</Text> : <SkeletonRow width={60} />}
      </Screen>
    );
  }

  const people = members.data ?? [];
  const manages = team.role !== 'member';
  return (
    <Screen scroll edges={['bottom']} contentStyle={{ paddingBottom: space.huge }}>
      <View style={{ paddingBottom: space.md, gap: space.xxs }}>
        <Text variant="label" color="ink3">{t(`browse.youAre.${team.role}`)}</Text>
        <Text variant="title" accessibilityRole="header">{team.name}</Text>
        <Text variant="subhead" color="ink2">{`${t('browse.people', { count: team.members })} · ${t('browse.listCount', { count: lists.length })}`}</Text>
      </View>

      <BrowseRow label={t('browse.allTasks')} icon={<Feather name="list" size={17} color={colors.accent} />} count={open} onPress={() => navigation.navigate('BrowseList', { kind: 'team', id: teamId })} />

      <View style={[styles.section, { marginTop: space.xl }]}>
        <Text variant="label" color="ink2" accessibilityRole="header" style={styles.fill}>{t('browse.lists')}</Text>
        <Pressable onPress={() => showSheet({ kind: 'list', teamId })} accessibilityRole="button" accessibilityLabel={t('browse.menu.newListIn', { name: team.name })} style={styles.add}>
          <Feather name="plus" size={20} color={colors.accent} />
        </Pressable>
      </View>
      {lists.length ? lists.map((c) => (
        <BrowseRow key={c.id} label={c.name} icon={<ColorDot color={c.color} size={10} />} tint={faint(c.color, scheme)} count={c.openTasks ?? 0}
          onPress={() => navigation.navigate('Collection', { collectionId: c.id })} onLongPress={() => listMenu(c)} />
      )) : <Text variant="footnote" color="ink3" style={{ paddingVertical: space.xs }}>{t('browse.teamNoLists')}</Text>}

      <Text variant="label" color="ink2" accessibilityRole="header" style={{ marginTop: space.xl, marginBottom: space.xs }}>{t('browse.peopleTitle')}</Text>
      {members.isPending ? <SkeletonRow width={50} /> : people.slice(0, PEOPLE_PREVIEW).map((m) => (
        <View key={m.userId} style={[styles.person, { gap: space.md, borderBottomColor: colors.line }]}>
          <Avatar name={m.displayName} seed={m.userId} />
          <Text variant="body" numberOfLines={1} style={styles.fill}>{m.userId === me?.id ? t('browse.you', { name: m.displayName }) : m.displayName}</Text>
          <Text variant="subhead" color="ink3">{t(`browse.role.${m.role}`)}</Text>
        </View>
      ))}
      <ListRow
        label={t(people.length > PEOPLE_PREVIEW ? 'browse.allPeople' : manages ? 'browse.inviteManage' : 'browse.allPeopleShort', { count: people.length })}
        onPress={() => navigation.navigate('People', { kind: 'team', id: teamId })}
        divider={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  section: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  add: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10, marginVertical: -6 },
  person: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
});
