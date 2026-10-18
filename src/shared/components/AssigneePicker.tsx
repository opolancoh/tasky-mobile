import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Id } from '@/core/types';
import { useMembers } from '@/data/tasks/queries';
import { emailAssignee, isEmailAssignee, type AssignmentStatus, type TaskList, type UserRef } from '@/data/tasks/types';
import { ListRow, Notice, SectionLabel, SkeletonRow, Text, useTheme } from '@/shared/ui';
import { errorMessage } from '@/shared/i18n/errors';

import { Avatar } from './Faces';
import { PeoplePicker } from './PeoplePicker';

/**
 * Whether the user may give a task in this list to someone who doesn't see it (D70, D88): it's theirs and nobody else
 * sees it (Personal or a private list). A shared list, alone or in a team, is shared whole: its tasks go to its people.
 */
export const givesOutside = (list: Pick<TaskList, 'owner' | 'sharing'> | undefined, meId: Id | null | undefined): boolean =>
  !!list && list.sharing === 'private' && list.owner.id === meId;

export interface AssigneePickerProps {
  /** The list the task is in: its people are who can be picked. */
  taskListId: Id;
  /** Personal or a private list of the user's (`givesOutside`): anyone can also be picked by email (D70, D88). */
  canGiveOutside?: boolean;
  /** The signed-in user, listed first as "Me". */
  meId: Id;
  selected: UserRef | null;
  /** The selected person's status, shown beside them. */
  status?: AssignmentStatus | 'invited' | null;
  onPick(person: UserRef | null): void;
}

/**
 * Who a task is assigned to (M43, M44; Task detail and Quick add, on every list): the people who can see its list, you
 * first as "Me" (the only one on a private list or the Inbox), each with their open and late tasks (M79), the current one
 * checked with its status, and Unassign at
 * the end. On Personal and the user's private lists there is also **Only this task**: someone picked by email sees that
 * task only, not the list (D70, D88, M45, M71), found by name among the people they work with or typed as an email (M73). A tap picks and goes back.
 */
export function AssigneePicker({ taskListId, canGiveOutside = false, meId, selected, status, onPick }: AssigneePickerProps) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const members = useMembers({ kind: 'taskList', id: taskListId });
  if (members.isPending) return <ScrollView>{[60, 45, 70].map((w) => <SkeletonRow key={w} width={w} />)}</ScrollView>;
  if (members.error) return <Notice>{errorMessage(members.error)}</Notice>;
  const people = [...(members.data ?? [])].sort((a, b) => Number(b.userId === meId) - Number(a.userId === meId));
  // Someone already given the task from outside the list: shown under Only this task, checked.
  const outsider = selected && !people.some((m) => m.userId === selected.id) ? selected : null;
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {people.map((m, i) => {
        const on = selected?.id === m.userId;
        // Their workload under the name (M79): "6 open · 2 late", with the selected one's status first.
        const load = m.openTasks ? [t('people.openCount', { count: m.openTasks }), m.overdueTasks ? t('people.lateCount', { count: m.overdueTasks }) : ''] : [];
        const detail = [on && status ? t(`assign.status.${status}`) : '', ...load].filter(Boolean).join(' · ');
        return (
          <ListRow
            key={m.userId}
            label={m.userId === meId ? t('assign.me', { name: m.displayName }) : m.displayName}
            icon={<Avatar name={m.displayName} seed={m.userId} size={24} />}
            detail={detail || undefined}
            selected={on}
            onPress={() => onPick({ id: m.userId, displayName: m.displayName })}
            divider={i < people.length - 1 || !!selected || canGiveOutside}
          />
        );
      })}
      {canGiveOutside && (
        <View style={{ marginTop: space.lg }}>
          <SectionLabel>{t('assign.outside')}</SectionLabel>
          {outsider && (
            <ListRow
              label={outsider.displayName}
              icon={isEmailAssignee(outsider.id) ? <Feather name="mail" size={18} color={colors.ink2} /> : <Avatar name={outsider.displayName} seed={outsider.id} size={24} />}
              value={status ? t(`assign.status.${status}`) : undefined}
              selected
            />
          )}
          <PeoplePicker
            exclude={[...people.map((m) => m.userId), ...(selected ? [selected.id] : [])]}
            emailLabel={t('people.giveByEmail')}
            onPickPerson={(p) => onPick({ id: p.id, displayName: p.displayName })}
            onEmail={(email) => onPick(emailAssignee(email))}
          />
          <Text variant="footnote" color="ink3" style={[styles.note, { marginTop: space.sm }]}>{t('assign.outsideNote')}</Text>
        </View>
      )}
      {selected && <ListRow label={t('assign.unassign')} onPress={() => onPick(null)} chevron={false} divider={false} />}
      <Text variant="footnote" color="ink3" style={[styles.note, { marginTop: space.md }]}>{t(people.length > 1 || canGiveOutside ? 'assign.note' : 'assign.onlyYou')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  note: { paddingHorizontal: 2 },
});
