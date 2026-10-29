import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useReorderTaskLists, useReorderTags, useReorderTeams } from '@/data/tasks/mutations';
import { useTaskLists, useTags, useTeams } from '@/data/tasks/queries';
import type { TaskList, Tag, Team } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { ColorDot, faint, Notice, Screen, SearchField, Skeleton, SkeletonHeading, Text, useTheme } from '@/shared/ui';

import { useBrowseMenus } from './browseMenus';
import { groupTaskLists, moveInOrder, openInTeam } from './browseSections';
import { useShowBrowseSheet } from '@/shared/browseSheet/browseSheetStore';
import { BrowseRow, BrowseRowSkeleton, OwnerMark, SharedMark } from '@/shared/components/BrowseRow';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';
import { useFoldedSections, type SpacesSection } from './foldedSectionsStore';

type Group = 'mine' | 'shared' | 'teams' | 'tags';
type Item =
  | { type: 'header'; key: string }
  | { type: 'section'; key: string; title: string; add?: { label: string; onPress(): void }; fold?: { section: SpacesSection; folded: boolean; count: number } }
  | { type: 'list'; key: string; taskList: TaskList; group?: Group; index: number; size: number; flat?: boolean }
  | { type: 'team'; key: string; team: Team; count: number; index?: number; size?: number }
  | { type: 'tag'; key: string; tag: Tag; index: number; size: number }
  | { type: 'action'; key: string; label: string; body: string; icon: ComponentProps<typeof Feather>['name']; onPress(): void }
  | { type: 'hint'; key: string; text: string }
  | { type: 'skeleton'; key: string; width: number }
  | { type: 'skeletonHead'; key: string };

/** Over this many lists, teams and tags, a filter field shows under the title (M38). */
const FILTER_FROM = 25;

/**
 * Spaces, the second tab (06-mobile.md, M38, M70, M105; the route keeps the name Browse): the user's lists, teams and tags.
 * Teams, My lists, Shared with me (a row each, A–Z) and Tags, each folding from its heading (kept on the device). Personal,
 * Important, Assigned to me and by me, All tasks and More live on Home (M105). Every count opens its list. Edit reorders
 * lists inside their section and tags (arrows); a long press opens a row's menu (what the role allows).
 */
export function BrowseScreen() {
  const { t } = useTranslation();
  const { colors, radius, space, scheme } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const taskLists = useTaskLists();
  const teams = useTeams();
  const tags = useTags();
  const folded = useFoldedSections((s) => (me ? s.byUser[me.id] : undefined)) ?? {};
  const toggleFold = useFoldedSections((s) => s.toggle);
  const reorderLists = useReorderTaskLists();
  const reorderTags = useReorderTags();
  const reorderTeams = useReorderTeams();
  const showSheet = useShowBrowseSheet();
  const { listMenu, teamMenu, tagMenu } = useBrowseMenus();
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState('');

  const all = taskLists.data ?? [];
  // In the user's own order (D108), then A–Z for teams they haven't placed: as GET /teams sends them.
  const teamList = teams.data ?? [];
  const tagList = tags.data ?? [];
  const groups = groupTaskLists(all, teamList, me?.id);
  const many = all.length + teamList.length + tagList.length > FILTER_FROM;
  const query = filter.trim().toLowerCase().replace(/^#/, '');

  const open = (c: TaskList) => navigation.navigate('TaskList', { taskListId: c.id });
  const move = (group: Group, id: string, by: -1 | 1) => {
    if (group === 'tags') {
      const names = tagList.map((x) => x.name);
      reorderTags.mutate(moveInOrder(names, names, id, by));
    } else if (group === 'teams') {
      const ids = teamList.map((x) => x.id);
      reorderTeams.mutate(moveInOrder(ids, ids, id, by));
    } else {
      const ids = all.filter((c) => !c.isInbox).map((c) => c.id);
      reorderLists.mutate(moveInOrder(ids, (group === 'mine' ? groups.mine : groups.shared).map((c) => c.id), id, by));
    }
  };

  const items: Item[] = [{ type: 'header', key: 'header' }];
  const loading = taskLists.isPending || teams.isPending;
  const lists = (group: Group, cs: TaskList[]) => cs.forEach((taskList, index) => items.push({ type: 'list', key: `l-${taskList.id}`, taskList, group, index, size: cs.length }));

  // Loading (M27, M108, M115): rough on purpose, so it never names sections the screen may not have: three groups of rows
  // shaped like Spaces' (tile, name, count), each under a heading-shaped bar.
  if (loading) {
    [[52, 64], [58, 72, 46], [55, 40]].forEach((widths, g) => {
      items.push({ type: 'skeletonHead', key: `kh-${g}` });
      widths.forEach((width) => items.push({ type: 'skeleton', key: `k-${g}-${width}`, width }));
    });
  } else if (query) {
    // Filtering: flat results, by kind.
    const ls = all.filter((c) => !c.isInbox && c.name.toLowerCase().includes(query));
    const ts = teamList.filter((x) => x.name.toLowerCase().includes(query));
    const gs = tagList.filter((x) => x.name.includes(query));
    if (ls.length) items.push({ type: 'section', key: 's-fl', title: t('browse.lists') }, ...ls.map((taskList, index) => ({ type: 'list' as const, key: `l-${taskList.id}`, taskList, index, size: ls.length, flat: true })));
    if (ts.length) items.push({ type: 'section', key: 's-ft', title: t('browse.teams') }, ...ts.map((team) => ({ type: 'team' as const, key: `t-${team.id}`, team, count: openInTeam(groups, team.id) })));
    if (gs.length) items.push({ type: 'section', key: 's-fg', title: t('browse.tags') }, ...gs.map((tag, index) => ({ type: 'tag' as const, key: `g-${tag.name}`, tag, index, size: gs.length })));
    if (!ls.length && !ts.length && !gs.length) items.push({ type: 'hint', key: 'none', text: t('browse.noMatch', { query: filter.trim() }) });
  } else {
    // A section folds from its heading (not while editing): its rows go, its count shows.
    const fold = (section: SpacesSection, count: number) => (editing ? undefined : { section, folded: !!folded[section], count });
    const isOpen = (section: SpacesSection) => editing || !folded[section];

    // Teams first (M105), then My lists, Shared with me and Tags. Edit reorders them too (D108), with no add or join rows.
    const newTeam = () => showSheet({ kind: 'team' });
    if (editing) {
      if (teamList.length) {
        items.push({ type: 'section', key: 's-teams', title: t('browse.teams') });
        teamList.forEach((team, index) => items.push({ type: 'team', key: `t-${team.id}`, team, count: openInTeam(groups, team.id), index, size: teamList.length }));
      }
    } else {
      items.push({ type: 'section', key: 's-teams', title: t('browse.teams'), add: teamList.length && !folded.teams ? { label: t('browse.newTeam'), onPress: newTeam } : undefined, fold: teamList.length ? fold('teams', teamList.length) : undefined });
      if (teamList.length) { if (isOpen('teams')) teamList.forEach((team) => items.push({ type: 'team', key: `t-${team.id}`, team, count: openInTeam(groups, team.id) })); }
      else items.push({ type: 'action', key: 'a-team', label: t('browse.newTeam'), body: t('browse.newTeamBody'), icon: 'users', onPress: newTeam });
      // Links into the app (D95, M84): an invite link someone sent, pasted.
      if (!teamList.length || isOpen('teams')) items.push({ type: 'action', key: 'a-join', label: t('join.fromSpaces'), body: t('join.fromSpacesBody'), icon: 'link-2', onPress: () => navigation.navigate('JoinPaste') });
    }
    // Someone invited without an Inbox yet (D59): Start your own lists, which opens New list.
    if (!groups.inbox) {
      if (!editing) items.push({ type: 'action', key: 'start', label: t('browse.start'), body: t('browse.startBody'), icon: 'plus', onPress: () => showSheet({ kind: 'list' }) });
    } else {
      // Empty: the section's action is a row (New list), not the header's +.
      const newList = () => showSheet({ kind: 'list' });
      items.push({ type: 'section', key: 's-mine', title: t('browse.myLists'), add: editing || !groups.mine.length || folded.mine ? undefined : { label: t('browse.newList'), onPress: newList }, fold: groups.mine.length ? fold('mine', groups.mine.length) : undefined });
      if (groups.mine.length) { if (isOpen('mine')) lists('mine', groups.mine); }
      else if (!editing) items.push({ type: 'action', key: 'a-list', label: t('browse.newList'), body: t('browse.newListBody'), icon: 'plus', onPress: newList });
    }
    if (groups.shared.length) {
      items.push({ type: 'section', key: 's-shared', title: t('browse.sharedWithMe'), fold: fold('shared', groups.shared.length) });
      if (isOpen('shared')) lists('shared', groups.shared);
    }
    // Tags appear with the first one: they're added from a task, not here.
    if (tagList.length) {
      items.push({ type: 'section', key: 's-tags', title: t('browse.tags'), fold: fold('tags', tagList.length) });
      if (isOpen('tags')) tagList.forEach((tag, index) => items.push({ type: 'tag', key: `g-${tag.name}`, tag, index, size: tagList.length }));
    }

  }

  const refreshControl = usePullRefresh(taskLists, teams, tags);

  const tile = (name: ComponentProps<typeof Feather>['name'], color: string) => <Feather name={name} size={17} color={color} />;

  const ownLists = all.filter((c) => !c.isInbox).length;
  const summary = taskLists.isPending || teams.isPending || tags.isPending ? null
    : [teamList.length && t('browse.teamCount', { count: teamList.length }), ownLists && t('browse.listCount', { count: ownLists }), tagList.length && t('browse.tagCount', { count: tagList.length })]
        .filter(Boolean).join(' · ') || t('browse.summaryEmpty');

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.sm }}>
            {/* Edit and the filter act on what loaded (M115): until then, their shapes as skeletons. */}
            <View style={styles.bar}>
              {loading && <View style={styles.barButton}><Skeleton width={34} height={14} /></View>}
              {!loading && all.length + tagList.length + teamList.length > 1 && !query && (
                <Pressable onPress={() => setEditing(!editing)} hitSlop={8} accessibilityRole="button" style={styles.barButton}>
                  <Text variant="button" color="accent">{t(editing ? 'common.done' : 'browse.edit')}</Text>
                </Pressable>
              )}
            </View>
            <Text variant="largeTitle" accessibilityRole="header">{t('browse.title')}</Text>
            {editing ? <Text variant="subhead" color="ink2" style={{ marginTop: space.xs }}>{t('browse.editHint')}</Text>
              : summary ? <Text variant="subhead" color="ink2" style={{ marginTop: space.xs }}>{summary}</Text>
              : (
                <View accessible accessibilityLabel={t('browse.loading')} style={{ marginTop: space.xs + 4, marginBottom: 4 }}>
                  <Skeleton width={150} height={12} />
                </View>
              )}
            {loading && (
              <View style={{ marginTop: space.lg }}>
                <Skeleton width="100%" height={44} radius={radius.md} />
              </View>
            )}
            {many && !editing && !loading && (
              <View style={{ marginTop: space.lg }}>
                <SearchField value={filter} onChangeText={setFilter} placeholder={t('browse.filter')} clearLabel={t('browse.clearFilter')} />
              </View>
            )}
            {(taskLists.error || teams.error) && (
              <View style={{ marginTop: space.lg }}>
                <Notice>{errorMessage(taskLists.error ?? teams.error)}</Notice>
              </View>
            )}
          </View>
        );
      case 'section':
        return (
          <View style={[styles.section, { marginTop: space.xxl }]}>
            {item.fold ? (
              <Pressable
                onPress={() => me && toggleFold(me.id, item.fold!.section)}
                accessibilityRole="button"
                accessibilityState={{ expanded: !item.fold.folded }}
                hitSlop={8}
                style={[styles.fill, styles.foldHead, { gap: space.xs }]}
              >
                <Text variant="label" color="ink2" accessibilityRole="header" style={styles.caps}>{item.title}</Text>
                <Feather name={item.fold.folded ? 'chevron-right' : 'chevron-down'} size={14} color={colors.ink3} />
                {item.fold.folded && <Text variant="label" color="ink3">{item.fold.count}</Text>}
              </Pressable>
            ) : (
              <Text variant="label" color="ink2" accessibilityRole="header" style={[styles.fill, styles.caps]}>{item.title}</Text>
            )}
            {item.add && (
              <Pressable onPress={item.add.onPress} accessibilityRole="button" accessibilityLabel={item.add.label} style={styles.add}>
                <Feather name="plus" size={20} color={colors.accent} />
              </Pressable>
            )}
          </View>
        );
      case 'list': {
        const c = item.taskList, group = editing ? item.group : undefined;
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
            move={editing && !query && item.index !== undefined ? { up: item.index > 0 ? () => move('teams', item.team.id, -1) : undefined, down: item.index < item.size! - 1 ? () => move('teams', item.team.id, 1) : undefined } : undefined}
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
      case 'action':
        // A section's first step (M38): a dashed + tile, the action in the accent color, an example under it.
        return (
          <Pressable onPress={item.onPress} accessibilityRole="button" accessibilityHint={item.body} style={[styles.start, { gap: space.md }]}>
            <View style={[styles.startIcon, { borderColor: colors.accent }]}>
              <Feather name={item.icon} size={18} color={colors.accent} />
            </View>
            <View style={styles.fill}>
              <Text variant="bodyMedium" color="accent">{item.label}</Text>
              <Text variant="footnote" color="ink3">{item.body}</Text>
            </View>
          </Pressable>
        );
      case 'hint':
        return <Text variant="footnote" color="ink3" style={{ paddingVertical: space.xs }}>{item.text}</Text>;
      case 'skeleton':
        return <BrowseRowSkeleton width={item.width} />;
      case 'skeletonHead':
        return <View style={[styles.section, { marginTop: space.xxl }]}><SkeletonHeading /></View>;
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
        refreshControl={refreshControl}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: 44 },
  barButton: { minHeight: 44, justifyContent: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  // Section names in capitals, as on Home (M105).
  caps: { textTransform: 'uppercase', letterSpacing: 0.4 },
  foldHead: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  add: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10, marginVertical: -6 },
  start: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  startIcon: { width: 30, height: 30, borderRadius: 9, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
