import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useChangeRole, useRemoveMember } from '@/data/tasks/mutations';
import { useTaskLists } from '@/data/tasks/queries';
import type { Member, MembersOf, Team } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { Avatar } from '@/shared/components';
import { toastError } from '@/shared/i18n/errors';
import { chooseAction, confirm, Text, useTheme, useToast } from '@/shared/ui';

/**
 * One person in a team's or list's People (M38) and its See all (D105): name, role, and in a team their open and late tasks
 * (M79), a tap opening those tasks; an Owner long-presses for Make owner or member and Remove (D125, roles doc).
 */
export function MemberRow({ of, team, member: m }: { of: MembersOf; team: Team | undefined; member: Member }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const list = useTaskLists().data?.find((c) => of.kind === 'taskList' && c.id === of.id);
  const remove = useRemoveMember();
  const changeRole = useChangeRole(of);

  const roleOf = (m: Member) => (m.isGuest ? t('browse.role.guest') : t(`browse.role.${m.role}`));
  const cancel = t('common.cancel');
  const inTeam = of.kind === 'team';
  // Owners manage people; roles change in a team or a list outside one, and on a team's list Owners remove guests (D125).
  const owner = inTeam ? team?.role === 'owner' : list?.role === 'owner';
  const name = (inTeam ? team?.name : list?.name) ?? '';
  const show = (message: string) => useToast.getState().show({ message });

  const personActions = (m: Member) => {
    const roles = (inTeam || (!!list && !list.team)) && !m.isGuest;
    if (!owner || m.userId === me?.id || (!roles && !m.isGuest)) return [];
    return [
      roles && m.role === 'member' && {
        label: t('browse.person.make.owner'),
        icon: 'award' as const,
        run: async () => {
          const ok = await confirm({ title: t('browse.person.makeOwnerTitle', { name: m.displayName }), message: t('browse.person.makeOwnerBody', { team: name }), confirmLabel: t('browse.person.makeOwnerConfirm'), cancelLabel: cancel });
          if (ok) changeRole.mutate({ userId: m.userId, role: 'owner' }, { onSuccess: () => show(t('browse.person.ownerNow', { name: m.displayName })), onError: toastError });
        },
      },
      roles && m.role === 'owner' && {
        label: t('browse.person.make.member'),
        icon: 'user' as const,
        run: () => changeRole.mutate({ userId: m.userId, role: 'member' }, { onSuccess: () => show(t('browse.person.memberNow', { name: m.displayName })), onError: toastError }),
      },
      {
        label: t(inTeam ? 'browse.person.remove' : 'browse.person.removeFromList'),
        icon: 'user-minus' as const,
        destructive: true,
        run: async () => {
          const ok = await confirm({ title: t('browse.person.removeTitle', { name: m.displayName, team: name }), message: t(inTeam ? 'browse.person.removeBody' : 'browse.person.removeListBody'), confirmLabel: t(inTeam ? 'browse.person.remove' : 'browse.person.removeFromList'), cancelLabel: cancel });
          if (ok) remove.mutate({ of, userId: m.userId }, { onSuccess: () => show(t('browse.person.removed', { name: m.displayName })), onError: toastError });
        },
      },
    ].filter((x) => !!x);
  };
  /** Their open tasks in this team (M79): All tasks filtered to them, by date. */
  const openTasks = (m: Member) => navigation.navigate('BrowseList', { kind: 'team', id: of.id, person: m.userId, personName: m.userId === me?.id ? undefined : m.displayName });
  const openPerson = async (m: Member) => {
    const actions = personActions(m);
    const i = await chooseAction({ title: `${m.displayName} · ${roleOf(m)}`, actions, cancelLabel: cancel });
    if (i !== null) actions[i].run();
  };

  const acts = personActions(m).length > 0;
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
