import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { useChangeTeamRole, useInvite, useInvitePeople, useRemoveMember, useRevokeInvitation, useTransferTeam } from '@/data/tasks/mutations';
import { useTaskLists, useMembers, useOpenInvitations, useTasks, useTeams } from '@/data/tasks/queries';
import type { Member, MembersOf, OpenInvitation, Person, UserRef } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { Avatar, PeoplePicker } from '@/shared/components';
import { errorMessage, toastError } from '@/shared/i18n/errors';
import { chooseAction, confirm, Notice, Screen, SkeletonRow, Text, useTheme, useToast } from '@/shared/ui';

import { canInvite, canLeave } from './browseSections';

type Item =
  | { type: 'header'; key: string }
  | { type: 'section'; key: string; title: string }
  | { type: 'member'; key: string; member: Member }
  | { type: 'invitation'; key: string; invitation: OpenInvitation }
  | { type: 'leave'; key: string }
  | { type: 'skeleton'; key: string };

/**
 * A team's or a list's people (M38): everyone and their role (Guest for someone only in one of a team's lists). Those
 * who invite (a list's owner; a team's owner and admins) get Invite by email and the open invitations with Revoke.
 * Leave at the end for whoever may (asks first). In a team (M76), a manager taps someone for a sheet with what their role
 * allows (roles doc): the owner makes them Admin or Member, makes them the owner (asks first; the owner becomes Admin) or
 * removes them; an admin removes members.
 */
export function PeopleScreen({ route }: StaticScreenProps<MembersOf>) {
  const of: MembersOf = { kind: route.params.kind, id: route.params.id };
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const teams = useTeams().data ?? [];
  const taskLists = useTaskLists().data;
  const taskList = of.kind === 'taskList' ? taskLists?.find((c) => c.id === of.id) : undefined;
  const team = of.kind === 'team' ? teams.find((x) => x.id === of.id) : taskList?.team ? teams.find((x) => x.id === taskList.team!.id) : undefined;
  const invites = of.kind === 'team' ? !!team && team.role !== 'member' : !!taskList && canInvite(taskList, team);
  const leaves = of.kind === 'team' ? !!team && team.role !== 'owner' : !!taskList && canLeave(taskList, team, me?.id);
  const members = useMembers(of);
  const open = useOpenInvitations(of, invites);
  const revoke = useRevokeInvitation(of);
  const remove = useRemoveMember();
  const changeRole = useChangeTeamRole(of.id);
  const transfer = useTransferTeam();
  const name = of.kind === 'team' ? team?.name : taskList?.name;
  // Sharing a private list that has tasks given outside it (D88, M71): the first invitation asks about those people.
  const privateList = !!taskList && taskList.sharing === 'private' && invites;
  const listTasks = useTasks({ taskListId: of.id, sort: 'taskList' }, privateList);
  const outsiders = privateList && !open.data?.length
    ? [...new Map((listTasks.data?.items ?? []).filter((x) => x.assignee && x.assignee.id !== me?.id).map((x) => [x.assignee!.id, x.assignee!])).values()]
    : [];

  const leave = async () => {
    if (!me || !name) return;
    const ok = await confirm({ title: t('browse.leaveTitle', { name }), message: t(of.kind === 'team' ? 'browse.leaveTeamBody' : 'browse.leaveListBody', { name: taskList?.owner.displayName }), confirmLabel: t(of.kind === 'team' ? 'browse.menu.leaveTeam' : 'browse.menu.leaveList'), cancelLabel: t('common.cancel') });
    if (ok) remove.mutate({ of, userId: me.id }, { onSuccess: () => { navigation.navigate('Tabs', { screen: 'Browse' }); useToast.getState().show({ message: t('browse.left', { name }) }); } });
  };

  const items: Item[] = [{ type: 'header', key: 'header' }];
  if (members.isPending) items.push({ type: 'skeleton', key: 'k' });
  else {
    items.push({ type: 'section', key: 's-people', title: t('browse.people', { count: members.data?.length ?? 0 }) });
    (members.data ?? []).forEach((member) => items.push({ type: 'member', key: member.userId, member }));
  }
  if (invites && open.data?.length) {
    items.push({ type: 'section', key: 's-invited', title: t('browse.invitedTitle') });
    open.data.forEach((invitation) => items.push({ type: 'invitation', key: invitation.id, invitation }));
  }
  if (leaves) items.push({ type: 'leave', key: 'leave' });

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
  const openPerson = async (m: Member) => {
    const actions = personActions(m);
    const i = await chooseAction({ title: `${m.displayName} · ${roleOf(m)}`, actions, cancelLabel: cancel });
    if (i !== null) actions[i].run();
  };

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.sm, gap: space.xxs }}>
            {name ? <Text variant="label" color="ink3">{name}</Text> : null}
            <Text variant="title" accessibilityRole="header">{t('browse.peopleTitle')}</Text>
            <Text variant="subhead" color="ink2">{t(invites ? (team?.role === 'owner' && of.kind === 'team' ? 'browse.peopleTeamOwner' : 'browse.peopleCanInvite') : of.kind === 'team' ? 'browse.peopleTeamOnly' : 'browse.peopleOwnerOnly')}</Text>
            {invites && <InviteField of={of} outsiders={outsiders} exclude={(members.data ?? []).map((m) => m.userId)} />}
            {invites && <Text variant="footnote" color="ink3" style={{ marginTop: space.xs }}>{t(of.kind === 'team' ? 'browse.inviteTeamHint' : 'browse.inviteListHint')}</Text>}
            {(members.error || remove.error) && (
              <View style={{ marginTop: space.md }}>
                <Notice>{errorMessage(members.error ?? remove.error)}</Notice>
              </View>
            )}
          </View>
        );
      case 'section':
        return <Text variant="label" color="ink2" accessibilityRole="header" style={{ marginTop: space.xl, marginBottom: space.xs }}>{item.title}</Text>;
      case 'member': {
        const m = item.member;
        const acts = personActions(m).length > 0;
        return (
          <Pressable onPress={() => openPerson(m)} disabled={!acts} accessibilityRole={acts ? 'button' : undefined} style={[styles.row, { gap: space.md, borderBottomColor: colors.line }]}>
            <Avatar name={m.displayName} seed={m.userId} />
            <Text variant="body" numberOfLines={1} style={styles.fill}>{m.userId === me?.id ? t('browse.you', { name: m.displayName }) : m.displayName}</Text>
            <Text variant="subhead" color="ink3">{roleOf(m)}</Text>
            {acts && <Feather name="chevron-right" size={16} color={colors.ink3} />}
          </Pressable>
        );
      }
      case 'invitation': {
        const v = item.invitation;
        const expires = me ? formatInstant(v.expiresAt, i18n.language, me.timeZone, { month: 'short', day: 'numeric' }) : '';
        return (
          <View style={[styles.row, { gap: space.md, borderBottomColor: colors.line }]}>
            <View style={[styles.mail, { backgroundColor: colors.surface2 }]}>
              <Feather name="mail" size={14} color={colors.ink2} />
            </View>
            <View style={styles.fill}>
              <Text variant="body" numberOfLines={1}>{v.email}</Text>
              <Text variant="footnote" color="ink3">{t('browse.expires', { date: expires })}</Text>
            </View>
            <Pressable onPress={() => revoke.mutate(v.id)} disabled={revoke.isPending} accessibilityRole="button" style={styles.send}>
              <Text variant="label" color="ink2">{t('browse.revoke')}</Text>
            </Pressable>
          </View>
        );
      }
      case 'leave':
        return (
          <Pressable onPress={leave} disabled={remove.isPending} accessibilityRole="button" style={[styles.leave, { gap: space.sm, marginTop: space.xxl }]}>
            <Feather name="log-out" size={17} color={colors.danger} />
            <Text variant="bodyMedium" color="danger">{t(of.kind === 'team' ? 'browse.menu.leaveTeam' : 'browse.menu.leaveList')}</Text>
          </Pressable>
        );
      case 'skeleton':
        return <SkeletonRow width={50} />;
    }
  };

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: space.huge }}
      />
    </Screen>
  );
}

/**
 * Invite (M56, M73): find someone the user works with, or a colleague (GET /people, D89), or type an email for someone new.
 * Saving shows busy at once; errors show under it, until the next pick. The first invitation of a private list with tasks
 * given outside it asks about those people first (D88, M71).
 */
function InviteField({ of, outsiders, exclude }: { of: MembersOf; outsiders: UserRef[]; exclude: Id[] }) {
  const { t } = useTranslation();
  const { space } = useTheme();
  const invite = useInvite(of);
  const invitePeople = useInvitePeople(of);
  const error = invite.error ?? invitePeople.error;

  /** People with a task given from this list (D88): invite them too (true), keep them (false), or cancel (null). */
  const askAboutOutsiders = async (): Promise<boolean | null> => {
    if (!outsiders.length) return false;
    const names = outsiders.map((p) => p.displayName.split(' ')[0]).join(', ');
    const choice = await chooseAction({
      title: t('browse.shareOutside.title', { names, count: outsiders.length }),
      actions: [{ label: t('browse.shareOutside.invite', { count: outsiders.length }), icon: 'user-plus' }, { label: t('browse.shareOutside.keep', { count: outsiders.length }), icon: 'user' }],
      cancelLabel: t('common.cancel'),
    });
    return choice === null ? null : choice === 0;
  };
  const alsoThem = (yes: boolean, except: Id | null = null) => {
    const ids = outsiders.map((p) => p.id).filter((id) => id !== except);
    if (yes && ids.length) invitePeople.mutate(ids);
  };

  const byEmail = async (email: string) => {
    if (invite.isPending) return;
    invite.reset();
    invitePeople.reset();
    const yes = await askAboutOutsiders();
    if (yes === null) return;
    invite.mutate(email, {
      onSuccess: ({ again }) => {
        useToast.getState().show({ message: t(again ? 'browse.invitedAgain' : 'browse.invited', { email }) });
        alsoThem(yes);
      },
    });
  };
  const byPerson = async (person: Person) => {
    if (invitePeople.isPending) return;
    invite.reset();
    invitePeople.reset();
    const yes = await askAboutOutsiders();
    if (yes === null) return;
    invitePeople.mutate([person.id], {
      onSuccess: () => {
        useToast.getState().show({ message: t('browse.invited', { email: person.displayName }) });
        alsoThem(yes, person.id);
      },
    });
  };
  return (
    <View style={{ marginTop: space.lg, gap: space.xs }}>
      <PeoplePicker exclude={exclude} emailLabel={t('people.inviteByEmail')} onPickPerson={byPerson} onEmail={byEmail} busy={invite.isPending || invitePeople.isPending} />
      {error && (
        <Text variant="footnote" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {errorMessage(error)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  mail: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  leave: { flexDirection: 'row', alignItems: 'center', minHeight: 44, alignSelf: 'flex-start' },
  send: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
});
