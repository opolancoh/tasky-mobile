import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useChangeTeamRole, useRemoveMember, useTransferTeam } from '@/data/tasks/mutations';
import type { Member, MembersOf, Team } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { Avatar } from '@/shared/components';
import { toastError } from '@/shared/i18n/errors';
import { chooseAction, confirm, Text, useTheme, useToast } from '@/shared/ui';

/**
 * One person in a team's or list's People (M38) and its See all (D105): name, role, and in a team their open and late tasks
 * (M79), a tap opening those tasks; a manager long-presses for what their role allows (roles doc).
 */
export function MemberRow({ of, team, member: m }: { of: MembersOf; team: Team | undefined; member: Member }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const remove = useRemoveMember();
  const changeRole = useChangeTeamRole(of.id);
  const transfer = useTransferTeam();

  const roleOf = (m: Member) => (m.isGuest ? t('browse.role.guest') : t(`browse.role.${m.role}`));
  const cancel = t('common.cancel');

  /** What the caller may do to someone in the team (roles doc); nothing on their own row or the owner's. */
  const personActions = (m: Member) => {
    if (!team || of.kind !== 'team' || m.userId === me?.id || m.role === 'owner' || team.role === 'member') return [];
    const removeIt = {
      label: t('browse.person.remove'),
      icon: 'user-minus' as const,
      destructive: true,
      run: async () => {
        const ok = await confirm({ title: t('browse.person.removeTitle', { name: m.displayName, team: team.name }), message: t('browse.person.removeBody'), confirmLabel: t('browse.person.remove'), cancelLabel: cancel });
        if (ok) remove.mutate({ of, userId: m.userId }, { onSuccess: () => useToast.getState().show({ message: t('browse.person.removed', { name: m.displayName }) }), onError: toastError });
      },
    };
    if (team.role === 'admin') return m.role === 'member' ? [removeIt] : [];
    const role = m.role === 'admin' ? 'member' : 'admin';
    return [
      { label: t(`browse.person.make.${role}`), icon: 'user' as const, run: () => changeRole.mutate({ userId: m.userId, role }, { onError: toastError }) },
      {
        label: t('browse.person.makeOwner'),
        icon: 'award' as const,
        run: async () => {
          const ok = await confirm({ title: t('browse.person.makeOwnerTitle', { name: m.displayName }), message: t('browse.person.makeOwnerBody', { team: team.name }), confirmLabel: t('browse.person.makeOwnerConfirm'), cancelLabel: cancel });
          if (ok) transfer.mutate({ team, userId: m.userId }, { onSuccess: () => useToast.getState().show({ message: t('browse.person.ownerNow', { name: m.displayName }) }), onError: toastError });
        },
      },
      removeIt,
    ];
  };
  /** Their open tasks in this team (M79): All tasks filtered to them, by date. */
  const openTasks = (m: Member) => navigation.navigate('BrowseList', { kind: 'team', id: of.id, person: m.userId, personName: m.userId === me?.id ? undefined : m.displayName });
  const openPerson = async (m: Member) => {
    const actions = personActions(m);
    const i = await chooseAction({ title: `${m.displayName} · ${roleOf(m)}`, actions, cancelLabel: cancel });
    if (i !== null) actions[i].run();
  };

  const acts = personActions(m).length > 0;
  const inTeam = of.kind === 'team';
  return (
    <Pressable
      onPress={inTeam ? () => openTasks(m) : () => openPerson(m)}
      onLongPress={inTeam && acts ? () => openPerson(m) : undefined}
      disabled={!inTeam && !acts}
      accessibilityRole={inTeam || acts ? 'button' : undefined}
      accessibilityActions={inTeam && acts ? [{ name: 'longpress', label: t('browse.person.manage') }] : undefined}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && openPerson(m)}
      style={({ pressed }) => [styles.row, { gap: space.md, borderBottomColor: colors.line, backgroundColor: pressed && (inTeam || acts) ? colors.surface2 : 'transparent' }]}
    >
      <Avatar name={m.displayName} seed={m.userId} />
      <View style={styles.fill}>
        <Text variant="body" numberOfLines={1}>{m.userId === me?.id ? t('browse.you', { name: m.displayName }) : m.displayName}</Text>
        {inTeam && <Text variant="footnote" color="ink3">{roleOf(m)}</Text>}
      </View>
      {inTeam ? (
        // Workload (M79): open tasks in the team, late ones in red under; nothing when none.
        m.openTasks > 0 && (
          <View style={styles.load}>
            <Text variant="bodyMedium">{m.openTasks}</Text>
            {m.overdueTasks > 0 && <Text variant="caption" color="danger">{t('people.lateCount', { count: m.overdueTasks })}</Text>}
          </View>
        )
      ) : (
        <Text variant="subhead" color="ink3">{roleOf(m)}</Text>
      )}
      {(inTeam || acts) && <Feather name="chevron-right" size={16} color={colors.ink3} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  load: { alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
});
