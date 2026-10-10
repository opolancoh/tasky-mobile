import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import type { Id } from '@/core/types';
import { useMembers } from '@/data/tasks/queries';
import type { AssignmentStatus, UserRef } from '@/data/tasks/types';
import { ListRow, Notice, SkeletonRow, Text, useTheme } from '@/shared/ui';
import { errorMessage } from '@/shared/i18n/errors';

import { Avatar } from './Faces';

export interface AssigneePickerProps {
  /** The list the task is in: its people are who can be picked. */
  collectionId: Id;
  /** The signed-in user, listed first as "Me". */
  meId: Id;
  selected: UserRef | null;
  /** The selected person's status, shown beside them. */
  status?: AssignmentStatus | null;
  onPick(person: UserRef | null): void;
}

/**
 * Who a task is assigned to (M43, M44; Task detail and Quick add, on every list): the people who can see its list, you
 * first as "Me" (the only one on a private list or the Inbox), the current one checked with its status, and Unassign at
 * the end. A tap picks and goes back.
 */
export function AssigneePicker({ collectionId, meId, selected, status, onPick }: AssigneePickerProps) {
  const { t } = useTranslation();
  const { space } = useTheme();
  const members = useMembers({ kind: 'collection', id: collectionId });
  if (members.isPending) return <ScrollView>{[60, 45, 70].map((w) => <SkeletonRow key={w} width={w} />)}</ScrollView>;
  if (members.error) return <Notice>{errorMessage(members.error)}</Notice>;
  const people = [...(members.data ?? [])].sort((a, b) => Number(b.userId === meId) - Number(a.userId === meId));
  return (
    <ScrollView>
      {people.map((m, i) => {
        const on = selected?.id === m.userId;
        return (
          <ListRow
            key={m.userId}
            label={m.userId === meId ? t('assign.me', { name: m.displayName }) : m.displayName}
            icon={<Avatar name={m.displayName} seed={m.userId} size={24} />}
            value={on && status ? t(`assign.status.${status}`) : undefined}
            selected={on}
            onPress={() => onPick({ id: m.userId, displayName: m.displayName })}
            divider={i < people.length - 1 || !!selected}
          />
        );
      })}
      {selected && <ListRow label={t('assign.unassign')} onPress={() => onPick(null)} chevron={false} divider={false} />}
      <Text variant="footnote" color="ink3" style={[styles.note, { marginTop: space.md }]}>{t(people.length > 1 ? 'assign.note' : 'assign.onlyYou')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ note: { paddingHorizontal: 2 } });
