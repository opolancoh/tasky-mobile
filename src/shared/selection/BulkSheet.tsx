import { useQueries } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { todayIn } from '@/core/dates/localDate';
import type { Id, LocalDate } from '@/core/types';
import { tasksApi } from '@/data/tasks/api';
import { taskKeys } from '@/data/tasks/keys';
import { useTaskLists } from '@/data/tasks/queries';
import type { Member, TaskSummary } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { Avatar, DueDatePicker, TaskListPicker } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { ListRow, Notice, SectionLabel, Sheet, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { pickedTasks, useSelection, type BulkSheetPage } from './selectionStore';
import { useBulkActions } from './useBulkActions';

/**
 * The selection bar's pickers (M81), one sheet at the app root: **Date** (the usual picker; one date for all, No date
 * clears), **Move** (the user's lists), **Assign** (only people in every selected task's list, then Unassign; those in
 * some lists but not all are shown greyed). Each opening starts from the tasks picked then.
 */
export function BulkSheet() {
  const sheet = useSelection((s) => s.sheet);
  const [last, setLast] = useState<{ page: BulkSheetPage; n: number; open: boolean } | null>(null);
  // The page stays while the sheet animates out; each opening starts fresh, from the tasks picked then.
  if (sheet && !last?.open) setLast({ page: sheet, n: (last?.n ?? 0) + 1, open: true });
  if (!sheet && last?.open) setLast({ ...last, open: false });
  if (!last) return null;
  return <Pages key={last.n} page={last.page} open={!!sheet} />;
}

function Pages({ page, open }: { page: BulkSheetPage; open: boolean }) {
  const { t } = useTranslation();
  const [tasks] = useState(pickedTasks);
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const bulk = useBulkActions();
  const [due, setDue] = useState<LocalDate | undefined>(undefined);
  const hide = () => useSelection.setState({ sheet: null });
  const count = tasks.length;
  const title = { date: t('select.dateFor', { count }), move: t('select.moveTo', { count }), assign: t('select.assignTasks', { count }) }[page];
  return (
    <Sheet
      visible={open}
      onDismiss={hide}
      dismissLabel={t('common.close')}
      title={title}
      left={{ label: t('common.cancel'), onPress: hide }}
      right={page === 'date' && due ? { label: t('common.done'), emphasis: true, onPress: () => bulk.setDate(due) } : undefined}
    >
      {page === 'date' && today && <DueDatePicker value={due} today={today} onPick={(d) => bulk.setDate(d ?? null)} onChange={setDue} />}
      {page === 'move' && <MovePage tasks={tasks} onPick={bulk.move} />}
      {page === 'assign' && me && <AssignPage tasks={tasks} meId={me.id} onPick={bulk.assign} />}
    </Sheet>
  );
}

function MovePage({ tasks, onPick }: { tasks: TaskSummary[]; onPick: Parameters<typeof TaskListPicker>[0]['onPick'] }) {
  const { t } = useTranslation();
  const lists = useTaskLists();
  const from = new Set(tasks.map((x) => x.taskList?.id));
  const named = (lists.data ?? []).map((c) => (c.isInbox ? { ...c, name: t('browse.inbox') } : c));
  return <TaskListPicker taskLists={named} loading={lists.isPending} selectedId={from.size === 1 ? [...from][0] : undefined} onPick={onPick} />;
}

function AssignPage({ tasks, meId, onPick }: { tasks: TaskSummary[]; meId: Id; onPick(person: { id: Id; displayName: string } | null): void }) {
  const { t } = useTranslation();
  const { space } = useTheme();
  // Each list's people, cached from Task detail or People (the same query as useMembers).
  const listIds = [...new Set(tasks.map((x) => x.taskList?.id ?? ''))];
  const lists = useQueries({
    queries: listIds.map((id) => ({ queryKey: taskKeys.members('taskList', id), queryFn: () => tasksApi.members({ kind: 'taskList', id }), enabled: !!id })),
  });
  if (lists.some((q, i) => !!listIds[i] && q.isPending)) return <ScrollView>{[60, 45, 70].map((w) => <SkeletonRow key={w} width={w} />)}</ScrollView>;
  const failed = lists.find((q) => q.error);
  if (failed) return <Notice>{errorMessage(failed.error)}</Notice>;
  const names = new Map(tasks.map((x) => [x.taskList?.id ?? '', x.taskList?.isInbox ? t('browse.inbox') : (x.taskList?.name ?? '')]));
  const people = new Map<Id, Member>();
  lists.forEach((q) => (q.data ?? []).forEach((m) => people.set(m.userId, m)));
  const inList = (i: number, userId: Id) => !!lists[i].data?.some((m) => m.userId === userId);
  const everyone = [...people.values()].sort((a, b) => Number(b.userId === meId) - Number(a.userId === meId));
  const common = everyone.filter((m) => listIds.every((_, i) => inList(i, m.userId)));
  const some = everyone.filter((m) => !common.includes(m));
  const assigned = tasks.some((x) => x.assignee);
  const label = (m: Member) => (m.userId === meId ? t('assign.me', { name: m.displayName }) : m.displayName);
  return (
    <ScrollView>
      <Text variant="footnote" color="ink3" style={{ marginBottom: space.sm }}>{t('select.peopleIn', { lists: [...names.values()].filter(Boolean).join(', ') })}</Text>
      {common.map((m, i) => (
        <ListRow key={m.userId} label={label(m)} icon={<Avatar name={m.displayName} seed={m.userId} size={24} />} onPress={() => onPick({ id: m.userId, displayName: m.displayName })} divider={i < common.length - 1 || assigned} />
      ))}
      {assigned && <ListRow label={t('assign.unassign')} onPress={() => onPick(null)} chevron={false} divider={false} />}
      {!common.length && <Text variant="subhead" color="ink3">{t('select.nobodyInAll')}</Text>}
      {some.length > 0 && (
        <View style={[styles.some, { marginTop: space.lg }]}>
          <SectionLabel>{t('select.notInAll')}</SectionLabel>
          {some.map((m, i) => {
            const missing = listIds.findIndex((_, j) => !inList(j, m.userId));
            return <ListRow key={m.userId} label={label(m)} icon={<Avatar name={m.displayName} seed={m.userId} size={24} />} detail={t('select.notIn', { name: names.get(listIds[missing]) ?? '' })} chevron={false} divider={i < some.length - 1} />;
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  some: { opacity: 0.5 },
});
