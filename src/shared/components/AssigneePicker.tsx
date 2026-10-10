import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { Id } from '@/core/types';
import { isEmail } from '@/core/validation/rules';
import { useMembers } from '@/data/tasks/queries';
import { emailAssignee, isEmailAssignee, type AssignmentStatus, type Collection, type UserRef } from '@/data/tasks/types';
import { ListRow, Notice, SectionLabel, SkeletonRow, Text, useTheme } from '@/shared/ui';
import { errorMessage } from '@/shared/i18n/errors';

import { Avatar } from './Faces';

/**
 * Whether the user may give a task in this list to someone who doesn't see it (D70): they own it, and it's a private or
 * shared list outside a team (a team's lists are everyone's in the team; the Inbox is only yours).
 */
export const givesOutside = (list: Pick<Collection, 'owner' | 'team' | 'isInbox'> | undefined, meId: Id | null | undefined): boolean =>
  !!list && !list.isInbox && !list.team && list.owner.id === meId;

export interface AssigneePickerProps {
  /** The list the task is in: its people are who can be picked. */
  collectionId: Id;
  /** The list's owner, outside a team (`givesOutside`): anyone can also be picked by email (D70). */
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
 * first as "Me" (the only one on a private list or the Inbox), the current one checked with its status, and Unassign at
 * the end. The list's owner also gets **Only this task**: someone picked by email sees that task only, not the list
 * (D70, M45). A tap picks and goes back.
 */
export function AssigneePicker({ collectionId, canGiveOutside = false, meId, selected, status, onPick }: AssigneePickerProps) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const members = useMembers({ kind: 'collection', id: collectionId });
  if (members.isPending) return <ScrollView>{[60, 45, 70].map((w) => <SkeletonRow key={w} width={w} />)}</ScrollView>;
  if (members.error) return <Notice>{errorMessage(members.error)}</Notice>;
  const people = [...(members.data ?? [])].sort((a, b) => Number(b.userId === meId) - Number(a.userId === meId));
  // Someone already given the task from outside the list: shown under Only this task, checked.
  const outsider = selected && !people.some((m) => m.userId === selected.id) ? selected : null;
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
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
          <EmailField onPick={(email) => onPick(emailAssignee(email))} />
          <Text variant="footnote" color="ink3" style={[styles.note, { marginTop: space.sm }]}>{t('assign.outsideNote')}</Text>
        </View>
      )}
      {selected && <ListRow label={t('assign.unassign')} onPress={() => onPick(null)} chevron={false} divider={false} />}
      <Text variant="footnote" color="ink3" style={[styles.note, { marginTop: space.md }]}>{t(people.length > 1 || canGiveOutside ? 'assign.note' : 'assign.onlyYou')}</Text>
    </ScrollView>
  );
}

/** Someone else, by email: the typed text lives here (docs/performance.md); Assign once it's an email. */
function EmailField({ onPick }: { onPick(email: string): void }) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const [email, setEmail] = useState('');
  const value = email.trim().toLowerCase();
  const valid = isEmail(value);
  const send = () => valid && onPick(value);
  return (
    <View style={[styles.field, { gap: space.sm, borderBottomColor: colors.accent }]}>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder={t('assign.byEmail')}
        placeholderTextColor={colors.ink3}
        selectionColor={colors.accent}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="done"
        onSubmitEditing={send}
        accessibilityLabel={t('assign.emailLabel')}
        style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }]}
      />
      <Pressable onPress={send} disabled={!valid} accessibilityRole="button" style={styles.send}>
        <Text variant="button" color={valid ? 'accent' : 'ink3'}>{t('assign.emailAssign')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { paddingHorizontal: 2 },
  field: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5 },
  input: { flex: 1, minHeight: 44, paddingVertical: 10 },
  send: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
});
