import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import type { Id } from '@/core/types';
import type { TaskList } from '@/data/tasks/types';
import { useSessionStore } from '@/shared/session/sessionStore';
import { inform, ListRow, SearchField, SectionLabel, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { useRecentLists } from './recentListsStore';
import { TaskListIcon } from './TaskListIcon';

const NO_IDS: Id[] = [];
const KIND_ORDER = { private: 0, shared: 1, team: 2 } as const;

/**
 * The List page (M111), the same wherever a list is picked: a search, Recent (the last 3 picked, not while searching),
 * then All lists (an ⓘ explains the kinds of lists), Personal first, then private, shared and team lists, each saying what it
 * is under its name. A tap picks and goes back. `note`, under the search, says why the set is narrowed (the lists a person
 * can have the task in). Skeleton rows while `loading`.
 */
export function TaskListPicker({ taskLists, loading, selectedId, note, onPick }: { taskLists: TaskList[]; loading?: boolean; selectedId: Id | undefined; note?: string; onPick(taskList: TaskList): void }) {
  const { t } = useTranslation();
  const { space } = useTheme();
  const userId = useSessionStore((s) => s.userId);
  const recentIds = useRecentLists((s) => (userId ? s.byUser[userId] : undefined)) ?? NO_IDS;
  const [text, setText] = useState('');
  if (loading) return <ScrollView>{[60, 45, 70, 50].map((w) => <SkeletonRow key={w} width={w} />)}</ScrollView>;

  const q = text.trim().toLowerCase();
  const found = q ? taskLists.filter((c) => c.name.toLowerCase().includes(q)) : taskLists;
  const recent = q ? [] : recentIds.map((id) => taskLists.find((c) => c.id === id)).filter((c): c is TaskList => !!c);
  const rest = found.filter((c) => !recent.includes(c))
    .map((c, i) => ({ c, i }))
    .sort((a, b) => Number(b.c.isInbox) - Number(a.c.isInbox) || KIND_ORDER[a.c.sharing] - KIND_ORDER[b.c.sharing] || a.i - b.i)
    .map(({ c }) => c);
  const kind = (c: TaskList) => c.isInbox ? undefined
    : c.sharing === 'private' ? t('taskLists.kind.private')
    : c.sharing === 'shared' ? t('taskLists.kind.shared')
    : t('taskLists.kind.team', { name: c.team?.name ?? '' });
  const pick = (c: TaskList) => {
    if (userId) useRecentLists.getState().used(userId, c.id);
    onPick(c);
  };
  const rows = (list: TaskList[]) => list.map((c, i) => (
    <ListRow
      key={c.id}
      label={c.name}
      icon={<TaskListIcon taskList={c} tint="ink3" />}
      detail={kind(c)}
      selected={c.id === selectedId}
      onPress={() => pick(c)}
      divider={i < list.length - 1}
    />
  ));

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <SearchField value={text} onChangeText={setText} placeholder={t('taskLists.search')} clearLabel={t('search.clearField')} />
      {note && <Text variant="footnote" color="ink2" style={[styles.note, { marginTop: space.sm }]}>{note}</Text>}
      {recent.length > 0 && (
        <>
          <SectionLabel>{t('taskLists.recent')}</SectionLabel>
          {rows(recent)}
        </>
      )}
      <SectionLabel action={{ icon: 'info', label: t('taskLists.kinds.title'), onPress: () => inform(t('taskLists.kinds.title'), t('taskLists.kinds.body'), t('common.done')) }}>{t('taskLists.all')}</SectionLabel>
      {rows(rest)}
      {!found.length && <Text variant="footnote" color="ink3" style={styles.note}>{t('taskLists.none')}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  note: { paddingHorizontal: 2 },
});
