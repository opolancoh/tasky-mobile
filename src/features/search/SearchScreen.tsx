import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { todayIn } from '@/core/dates/localDate';
import { useSearch, useTags } from '@/data/tasks/queries';
import type { TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { LoadError } from '@/shared/components/LoadError';
import { SelectionBar, SelectionTopBar } from '@/shared/selection/SelectionBar';
import { selectable, useSelectionScope } from '@/shared/selection/selectionStore';
import { faint, Screen, SearchField, SkeletonRow, Text, useTheme } from '@/shared/ui';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';

import { useRecentSearches } from './recentSearchesStore';
import { SearchRow, searchWords } from './SearchRow';

/** Searching waits for this pause in typing. */
const PAUSE = 300;
const NO_RECENT: string[] = [];

type Item =
  | { type: 'header'; key: string }
  | { type: 'label'; key: string; title: string; clear?: boolean; count?: number }
  | { type: 'recent'; key: string; query: string }
  | { type: 'tags'; key: string }
  | { type: 'hint'; key: string; text: string }
  | { type: 'task'; key: string; task: TaskSummary }
  | { type: 'footer'; key: string };

/**
 * Search, the last tab (M39, M40, M74): tasks by the words in their titles, notes and steps, open and completed, in
 * everything the user can see (GET /search), best match first, 20 at a time. Before typing: the last searches and the
 * user's tags. A row shows the title with the words found in bold and its list; opening one remembers the search.
 * A long press on a result starts selecting (M81): Cancel · "3 selected" · All on top, the selection bar where the tab
 * bar was; completed results leave while selecting.
 */
export function SearchScreen() {
  const { t } = useTranslation();
  const { colors, space, scheme } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const [query, setQuery] = useState('');
  const [preset, setPreset] = useState({ text: '', n: 0 });
  const results = useSearch(query);
  const refreshControl = usePullRefresh(results);
  const tags = useTags().data ?? [];
  const recent = useRecentSearches((s) => (me ? s.byUser[me.id] : undefined)) ?? NO_RECENT;
  const remember = useRecentSearches((s) => s.remember);
  const forget = useRecentSearches((s) => s.forget);
  const clear = useRecentSearches((s) => s.clear);

  const words = searchWords(query);
  const { selecting } = useSelectionScope();
  const found = results.data?.pages.flatMap((p) => p.items) ?? [];
  const tasks = selecting ? found.filter(selectable) : found;
  // The selection bar takes the tab bar's place (M81): nothing else changes tab meanwhile.
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: { borderTopWidth: 0, elevation: 0, display: selecting ? 'none' : 'flex' } });   // as tabScreenOptions
  }, [navigation, selecting]);
  const searching = words.length > 0;
  const runRecent = (q: string) => {
    setPreset((p) => ({ text: q, n: p.n + 1 }));
    setQuery(q);
  };
  const open = (task: TaskSummary) => {
    if (me) remember(me.id, query);
    navigation.navigate('TaskDetail', { taskId: task.id });
  };

  const items: Item[] = [{ type: 'header', key: 'header' }];
  if (!searching) {
    if (recent.length) {
      items.push({ type: 'label', key: 'l-recent', title: t('search.recent'), clear: true });
      recent.forEach((q) => items.push({ type: 'recent', key: `r-${q}`, query: q }));
    }
    if (tags.length) items.push({ type: 'label', key: 'l-tags', title: t('search.tags') }, { type: 'tags', key: 'tags' });
    if (!recent.length && !tags.length) items.push({ type: 'hint', key: 'hint', text: t('search.empty') });
  } else {
    if (tasks.length) items.push({ type: 'label', key: 'l-tasks', title: t('search.tasks') });
    tasks.forEach((task) => items.push({ type: 'task', key: task.id, task }));
    items.push({ type: 'footer', key: 'footer' });
  }

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingTop: space.xl + space.lg, paddingBottom: space.xs, gap: space.md }}>
            <Text variant="largeTitle" accessibilityRole="header">{t('search.title')}</Text>
            <SearchBox key={preset.n} initial={preset.text} query={query} onQuery={setQuery} fetching={results.isFetching && !results.isFetchingNextPage} />
            {results.error && searching && !results.data && <LoadError error={results.error} onRetry={() => void results.refetch()} />}
          </View>
        );
      case 'label':
        return (
          <View style={[styles.label, { marginTop: space.lg }]}>
            <Text variant="label" color="ink2" accessibilityRole="header" style={styles.fill}>{item.title}</Text>
            {item.clear && me && (
              <Pressable onPress={() => clear(me.id)} hitSlop={8} accessibilityRole="button" style={styles.clear}>
                <Text variant="label" color="accent">{t('search.clear')}</Text>
              </Pressable>
            )}
          </View>
        );
      case 'recent':
        return (
          <View style={[styles.recent, { borderBottomColor: colors.line }]}>
            <Pressable onPress={() => runRecent(item.query)} accessibilityRole="button" style={[styles.recentMain, { gap: space.md }]}>
              <Feather name="clock" size={17} color={colors.ink3} />
              <Text variant="body" numberOfLines={1} style={styles.fill}>{item.query}</Text>
            </Pressable>
            <Pressable onPress={() => me && forget(me.id, item.query)} accessibilityRole="button" accessibilityLabel={t('search.forget', { query: item.query })} style={styles.x}>
              <Feather name="x" size={16} color={colors.ink3} />
            </Pressable>
          </View>
        );
      case 'tags':
        return (
          <View style={[styles.chips, { gap: space.sm, paddingTop: space.xs }]}>
            {tags.map((tag) => {
              const color = tag.color ?? colors.tagDefault;
              return (
                <Pressable key={tag.name} onPress={() => navigation.navigate('BrowseList', { kind: 'tag', id: tag.name })} accessibilityRole="button" style={[styles.chip, { backgroundColor: faint(color, scheme), gap: space.xs }]}>
                  <View style={[styles.chipDot, { backgroundColor: color }]} />
                  <Text variant="subhead">#{tag.name}</Text>
                </Pressable>
              );
            })}
          </View>
        );
      case 'hint':
        return <Text variant="subhead" color="ink2" style={{ marginTop: space.lg }}>{item.text}</Text>;
      case 'task':
        return <SearchRow task={item.task} words={words} today={today} onPress={() => open(item.task)} />;
      case 'footer':
        return results.isPending ? <View>{[70, 55, 62].map((w) => <SkeletonRow key={w} width={w} />)}</View>
          : results.hasNextPage ? <View style={styles.footer}><ActivityIndicator color={colors.ink3} /></View>
          : results.error && !results.data ? null
          : !tasks.length ? <Text variant="subhead" color="ink2" style={{ marginTop: space.lg }}>{t('search.noResults', { query: query.trim() })}</Text>
          : null;
    }
  };

  return (
    <Screen edges={['top']} contentStyle={styles.fill}>
      {selecting && <SelectionTopBar tasks={tasks} paged={results.hasNextPage} />}
      <FlashList
        refreshControl={refreshControl}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && results.fetchNextPage()}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
      {selecting && <SelectionBar insetBottom />}
    </Screen>
  );
}

/** The search field: the typed text lives here (docs/performance.md); the screen gets it after a short pause. */
function SearchBox({ initial, query, onQuery, fetching }: { initial: string; query: string; onQuery(q: string): void; fetching: boolean }) {
  const { t } = useTranslation();
  const [text, setText] = useState(initial);
  // Searching: from a keystroke until its results are in (the pause, then the request); the last results stay meanwhile.
  const busy = !!text.trim() && (text.trim() !== query || fetching);
  useEffect(() => {
    const timer = setTimeout(() => onQuery(text.trim()), text.trim() ? PAUSE : 0);
    return () => clearTimeout(timer);
  }, [text, onQuery]);
  return <SearchField value={text} onChangeText={setText} placeholder={t('search.placeholder')} clearLabel={t('search.clearField')} maxLength={200} busy={busy} busyLabel={t('search.searching')} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  label: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  clear: { minHeight: 44, justifyContent: 'center' },
  recent: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  recentMain: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', minHeight: 36, borderRadius: 18, paddingHorizontal: 12 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 56 },
});
