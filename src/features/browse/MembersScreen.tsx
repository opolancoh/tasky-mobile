import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SEARCH_DELAY } from '@/core/text/searchDelay';
import { useMemberPages, useTaskLists, useTeams } from '@/data/tasks/queries';
import type { MembersOf } from '@/data/tasks/types';
import { errorMessage } from '@/shared/i18n/errors';
import { Notice, radius, Screen, SearchField, Skeleton, SkeletonRow, Text, useTheme } from '@/shared/ui';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';

import { MemberRow } from './components/MemberRow';


/**
 * Everyone in a team or list (D105, the hub's *Members on demand*, A), from People's See all: a name search on top,
 * searched on the API, and pages of 30 as the list nears its end. Rows as in People (`MemberRow`).
 */
export function MembersScreen({ route }: StaticScreenProps<MembersOf & { name?: string }>) {
  const of: MembersOf = { kind: route.params.kind, id: route.params.id };
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();
  const teams = useTeams().data ?? [];
  const taskLists = useTaskLists().data;
  const taskList = of.kind === 'taskList' ? taskLists?.find((c) => c.id === of.id) : undefined;
  const team = of.kind === 'team' ? teams.find((x) => x.id === of.id) : taskList?.team ? teams.find((x) => x.id === taskList.team!.id) : undefined;
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [text]);
  const pages = useMemberPages(of, query);
  const refreshControl = usePullRefresh(pages);
  const members = pages.data?.pages.flatMap((p) => p.items) ?? [];
  const total = pages.data?.pages[0]?.total ?? members.length;
  const name = route.params.name ?? '';

  useLayoutEffect(() => {
    if (!query) navigation.setOptions({ title: t('browse.people', { count: total }) });
  }, [navigation, t, total, query]);

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <FlashList
        refreshControl={refreshControl}
        data={members}
        keyExtractor={(m) => m.userId}
        renderItem={({ item }) => <MemberRow of={of} team={team} member={item} />}
        onEndReached={() => pages.hasNextPage && !pages.isFetchingNextPage && pages.fetchNextPage()}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: space.huge }}
        ListHeaderComponent={
          <View style={{ paddingBottom: space.sm }}>
            {/* The find field waits for the first page (M115); a search on its way keeps it. */}
            {pages.isPending && !text ? <Skeleton width="100%" height={44} radius={radius.md} /> : <SearchField value={text} onChangeText={setText} placeholder={t('browse.findMember', { name })} clearLabel={t('browse.clearFind')} busy={text.trim() !== query || (pages.isFetching && !pages.isFetchingNextPage && !pages.isPending)} busyLabel={t('people.searching')} />}
            {pages.error && <View style={{ marginTop: space.md }}><Notice>{errorMessage(pages.error)}</Notice></View>}
          </View>
        }
        ListEmptyComponent={
          pages.isPending ? <SkeletonRow width={50} /> : query ? <Text variant="footnote" color="ink3" style={{ marginTop: space.md }}>{t('browse.noMember', { name })}</Text> : null
        }
        ListFooterComponent={pages.isFetchingNextPage ? <SkeletonRow width={45} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
