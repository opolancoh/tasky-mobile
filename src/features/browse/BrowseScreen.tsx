import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { byName } from '@/core/text/collate';
import { useReorderCollections, useReorderTags } from '@/data/tasks/mutations';
import { useArchivedCollections, useCollections, useTags, useTaskList, useTeams } from '@/data/tasks/queries';
import type { Collection, Tag, Team } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { ColorDot, faint, Notice, Screen, SearchField, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { useBrowseMenus } from './browseMenus';
import { groupCollections, moveInOrder, openInTeam } from './browseSections';
import { useShowBrowseSheet } from './browseSheetStore';
import { BrowseRow, OwnerMark, SharedMark } from './components/BrowseRow';

type Group = 'mine' | 'shared' | 'tags';
type Item =
  | { type: 'header'; key: string }
  | { type: 'section'; key: string; title: string; add?: { label: string; onPress(): void } }
  | { type: 'list'; key: string; collection: Collection; group?: Group; index: number; size: number; flat?: boolean }
  | { type: 'team'; key: string; team: Team; count: number }
  | { type: 'tag'; key: string; tag: Tag; index: number; size: number }
  | { type: 'nav'; key: string; label: string; icon: ComponentProps<typeof Feather>['name']; tone: 'accent' | 'success' | 'quiet'; count?: number; onPress(): void }
  | { type: 'start'; key: string }
  | { type: 'hint'; key: string; text: string }
  | { type: 'skeleton'; key: string; width: number };

/** Over this many lists, teams and tags, a filter field shows under the title (M38). */
const FILTER_FROM = 25;

/**
 * Browse, the second tab (06-mobile.md, M38, option B): everything the user can see. Inbox and Assigned to me; My
 * lists; Shared with me; Teams, a row each (A–Z), opening the team; Tags; More (Completed, Archived, Recently Deleted).
 * Every count opens its list. Edit reorders lists inside their section and tags (arrows); a long press opens a row's
 * menu (what the role allows).
 */
export function BrowseScreen() {
  const { t } = useTranslation();
  const { colors, space, scheme } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const collections = useCollections();
  const teams = useTeams();
  const tags = useTags();
  const archived = useArchivedCollections();
  const assigned = useTaskList({ assignee: 'me', limit: 1 });
  const reorderLists = useReorderCollections();
  const reorderTags = useReorderTags();
  const showSheet = useShowBrowseSheet();
  const { listMenu, teamMenu, tagMenu } = useBrowseMenus();
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const all = collections.data ?? [];
  const teamList = [...(teams.data ?? [])].sort(byName);
  const tagList = tags.data ?? [];
  const groups = groupCollections(all, teamList, me?.id);
  const many = all.length + teamList.length + tagList.length > FILTER_FROM;
  const query = filter.trim().toLowerCase().replace(/^#/, '');

  const open = (c: Collection) => navigation.navigate('Collection', { collectionId: c.id });
  const move = (group: Group, id: string, by: -1 | 1) => {
    if (group === 'tags') {
      const names = tagList.map((x) => x.name);
      reorderTags.mutate(moveInOrder(names, names, id, by));
    } else {
      const ids = all.filter((c) => !c.isInbox).map((c) => c.id);
      reorderLists.mutate(moveInOrder(ids, (group === 'mine' ? groups.mine : groups.shared).map((c) => c.id), id, by));
    }
  };

  const items: Item[] = [{ type: 'header', key: 'header' }];
  const loading = collections.isPending || teams.isPending;
  const lists = (group: Group, cs: Collection[]) => cs.forEach((collection, index) => items.push({ type: 'list', key: `l-${collection.id}`, collection, group, index, size: cs.length }));

  if (loading) [70, 55, 62, 48].forEach((width) => items.push({ type: 'skeleton', key: `k${width}`, width }));
  else if (query) {
    // Filtering: flat results, by kind.
    const ls = all.filter((c) => !c.isInbox && c.name.toLowerCase().includes(query));
    const ts = teamList.filter((x) => x.name.toLowerCase().includes(query));
    const gs = tagList.filter((x) => x.name.includes(query));
    if (ls.length) items.push({ type: 'section', key: 's-fl', title: t('browse.lists') }, ...ls.map((collection, index) => ({ type: 'list' as const, key: `l-${collection.id}`, collection, index, size: ls.length, flat: true })));
    if (ts.length) items.push({ type: 'section', key: 's-ft', title: t('browse.teams') }, ...ts.map((team) => ({ type: 'team' as const, key: `t-${team.id}`, team, count: openInTeam(groups, team.id) })));
    if (gs.length) items.push({ type: 'section', key: 's-fg', title: t('browse.tags') }, ...gs.map((tag, index) => ({ type: 'tag' as const, key: `g-${tag.name}`, tag, index, size: gs.length })));
    if (!ls.length && !ts.length && !gs.length) items.push({ type: 'hint', key: 'none', text: t('browse.noMatch', { query: filter.trim() }) });
  } else {
    // Inbox, then Assigned to me: the two lists that are only the user's.
    const assignedCount = assigned.data?.total ?? 0;
    if (!editing && groups.inbox) items.push({ type: 'list', key: 'inbox', collection: groups.inbox, index: 0, size: 1 });
    if (!editing && assignedCount) items.push({ type: 'nav', key: 'assigned', label: t('browse.assigned'), icon: 'user', tone: 'accent', count: assignedCount, onPress: () => navigation.navigate('BrowseList', { kind: 'assigned' }) });

    // Someone invited without an Inbox yet (D59): Start your own lists, which opens New list.
    if (!groups.inbox) {
      if (!editing) items.push({ type: 'start', key: 'start' });
    } else {
      items.push({ type: 'section', key: 's-mine', title: t('browse.myLists'), add: editing ? undefined : { label: t('browse.newList'), onPress: () => showSheet({ kind: 'list' }) } });
      if (groups.mine.length) lists('mine', groups.mine);
      else items.push({ type: 'hint', key: 'h-mine', text: t('browse.myListsEmpty') });
    }
    if (groups.shared.length) {
      items.push({ type: 'section', key: 's-shared', title: t('browse.sharedWithMe') });
      lists('shared', groups.shared);
    }
    if (!editing) {
      items.push({ type: 'section', key: 's-teams', title: t('browse.teams'), add: { label: t('browse.newTeam'), onPress: () => showSheet({ kind: 'team' }) } });
      if (teamList.length) teamList.forEach((team) => items.push({ type: 'team', key: `t-${team.id}`, team, count: openInTeam(groups, team.id) }));
      else items.push({ type: 'hint', key: 'h-teams', text: t('browse.teamsEmpty') });
    }
    items.push({ type: 'section', key: 's-tags', title: t('browse.tags') });
    if (tagList.length) tagList.forEach((tag, index) => items.push({ type: 'tag', key: `g-${tag.name}`, tag, index, size: tagList.length }));
    else items.push({ type: 'hint', key: 'h-tags', text: t('browse.tagsEmpty') });

    if (!editing) {
      const archivedCount = archived.data?.length ?? 0;
      items.push({ type: 'section', key: 's-more', title: t('browse.more') });
      items.push({ type: 'nav', key: 'done', label: t('browse.completed'), icon: 'check-circle', tone: 'success', onPress: () => navigation.navigate('BrowseList', { kind: 'completed' }) });
      if (archivedCount) items.push({ type: 'nav', key: 'archived', label: t('browse.archivedList'), icon: 'archive', tone: 'quiet', count: archivedCount, onPress: () => navigation.navigate('Archived') });
      items.push({ type: 'nav', key: 'deleted', label: t('browse.recentlyDeleted'), icon: 'trash-2', tone: 'quiet', onPress: () => navigation.navigate('RecentlyDeleted') });
    }
  }

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([collections.refetch(), teams.refetch(), tags.refetch(), archived.refetch(), assigned.refetch()]);
    setRefreshing(false);
  };

  const tile = (name: ComponentProps<typeof Feather>['name'], color: string) => <Feather name={name} size={17} color={color} />;
  const toneOf = { accent: [colors.accentSoft, colors.accent], success: [colors.successSoft, colors.success], quiet: [colors.surface2, colors.ink2] } as const;

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.sm }}>
            <View style={styles.bar}>
              {all.length + tagList.length > 1 && !query && (
                <Pressable onPress={() => setEditing(!editing)} hitSlop={8} accessibilityRole="button" style={styles.barButton}>
                  <Text variant="button" color="accent">{t(editing ? 'common.done' : 'browse.edit')}</Text>
                </Pressable>
              )}
            </View>
            <Text variant="largeTitle" accessibilityRole="header">{t('browse.title')}</Text>
            {editing && <Text variant="subhead" color="ink2" style={{ marginTop: space.xxs }}>{t('browse.editHint')}</Text>}
            {many && !editing && (
              <View style={{ marginTop: space.md }}>
                <SearchField value={filter} onChangeText={setFilter} placeholder={t('browse.filter')} clearLabel={t('browse.clearFilter')} />
              </View>
            )}
            {(collections.error || teams.error) && (
              <View style={{ marginTop: space.md }}>
                <Notice>{errorMessage(collections.error ?? teams.error)}</Notice>
              </View>
            )}
          </View>
        );
      case 'section':
        return (
          <View style={[styles.section, { marginTop: space.xl }]}>
            <Text variant="label" color="ink2" accessibilityRole="header" style={styles.fill}>{item.title}</Text>
            {item.add && (
              <Pressable onPress={item.add.onPress} accessibilityRole="button" accessibilityLabel={item.add.label} style={styles.add}>
                <Feather name="plus" size={20} color={colors.accent} />
              </Pressable>
            )}
          </View>
        );
      case 'list': {
        const c = item.collection, group = editing ? item.group : undefined;
        const aside = c.isInbox ? null
          : c.owner.id === me?.id && c.sharing === 'shared' ? <SharedMark />
          : !c.team || !teamList.some((x) => x.id === c.team!.id) ? (c.owner.id !== me?.id ? <OwnerMark name={c.owner.displayName} /> : null)
          : item.flat ? <OwnerMark name={c.team.name} /> : null;
        return (
          <BrowseRow
            label={c.isInbox ? t('browse.inbox') : c.name}
            icon={c.isInbox ? tile('inbox', colors.accent) : <ColorDot color={c.color} size={10} />}
            tint={c.isInbox ? undefined : faint(c.color, scheme)}
            count={c.openTasks ?? 0}
            aside={aside}
            onPress={() => open(c)}
            onLongPress={() => listMenu(c)}
            move={group ? { up: item.index > 0 ? () => move(group, c.id, -1) : undefined, down: item.index < item.size - 1 ? () => move(group, c.id, 1) : undefined } : undefined}
          />
        );
      }
      case 'team':
        return (
          <BrowseRow
            label={item.team.name}
            icon={<Text variant="caption" color="ink2">{item.team.name.slice(0, 2).toUpperCase()}</Text>}
            tint={colors.surface2}
            count={item.count}
            onPress={() => navigation.navigate('Team', { teamId: item.team.id })}
            onLongPress={() => teamMenu(item.team)}
          />
        );
      case 'tag': {
        const color = item.tag.color ?? colors.tagDefault;
        return (
          <BrowseRow
            label={item.tag.name}
            icon={<Text variant="headline" style={{ color }}>#</Text>}
            tint={faint(color, scheme)}
            count={item.tag.openTasks}
            onPress={() => navigation.navigate('BrowseList', { kind: 'tag', id: item.tag.name })}
            onLongPress={() => tagMenu(item.tag)}
            move={editing && !query ? { up: item.index > 0 ? () => move('tags', item.tag.name, -1) : undefined, down: item.index < item.size - 1 ? () => move('tags', item.tag.name, 1) : undefined } : undefined}
          />
        );
      }
      case 'nav': {
        const [bg, fg] = toneOf[item.tone];
        return <BrowseRow label={item.label} icon={tile(item.icon, fg)} tint={bg} count={item.count} onPress={item.onPress} />;
      }
      case 'start':
        return (
          <Pressable onPress={() => showSheet({ kind: 'list' })} accessibilityRole="button" style={[styles.start, { gap: space.md, marginTop: space.sm }]}>
            <View style={[styles.startIcon, { backgroundColor: colors.accentSoft }]}>
              <Feather name="plus" size={18} color={colors.accent} />
            </View>
            <View style={styles.fill}>
              <Text variant="bodyMedium" color="accent">{t('browse.start')}</Text>
              <Text variant="footnote" color="ink3">{t('browse.startBody')}</Text>
            </View>
          </Pressable>
        );
      case 'hint':
        return <Text variant="footnote" color="ink3" style={{ paddingVertical: space.xs }}>{item.text}</Text>;
      case 'skeleton':
        return <SkeletonRow width={item.width} />;
    }
  };

  return (
    <Screen edges={['top']} contentStyle={styles.fill}>
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: space.huge }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink3} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: 44 },
  barButton: { minHeight: 44, justifyContent: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  add: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10, marginVertical: -6 },
  start: { flexDirection: 'row', alignItems: 'center', minHeight: 60 },
  startIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
