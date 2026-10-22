import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { useInvite, useInviteLinkActions, useInvitePeople, useRemoveMember, useRevokeInvitation } from '@/data/tasks/mutations';
import { useInviteLink, useTaskLists, useMembersPreview, useOpenInvitations, useTasks, useTeams } from '@/data/tasks/queries';
import type { Member, MembersOf, OpenInvitation, Person, UserRef } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { PeoplePicker } from '@/shared/components';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { errorMessage, toastError } from '@/shared/i18n/errors';
import { chooseAction, confirm, ListRow, Notice, Screen, SkeletonRow, Text, useTheme, useToast } from '@/shared/ui';

import { canInvite, canLeave } from './browseSections';
import { MemberRow } from './components/MemberRow';

type Item =
  | { type: 'header'; key: string }
  | { type: 'section'; key: string; title: string }
  | { type: 'member'; key: string; member: Member }
  | { type: 'more'; key: string; total: number }
  | { type: 'invitation'; key: string; invitation: OpenInvitation }
  | { type: 'leave'; key: string }
  | { type: 'skeleton'; key: string };

/**
 * A team's or a list's people (M38): everyone and their role (Guest for someone only in one of a team's lists). Those
 * who invite (a list's owner; a team's owner and admins) get Invite by email and the open invitations with Revoke.
 * Leave at the end for whoever may (asks first). In a team, each person shows their open and late tasks there, and a tap
 * opens those tasks (M79); a manager long-presses someone for a sheet with what their role
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
  // The first few (D105): the owner, you, admins, then by when they joined; everyone only from See all.
  const members = useMembersPreview(of);
  const open = useOpenInvitations(of, invites);
  const revoke = useRevokeInvitation(of);
  const remove = useRemoveMember();
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
    const shown = members.data?.items ?? [];
    const total = members.data?.total ?? shown.length;
    items.push({ type: 'section', key: 's-people', title: t('browse.people', { count: total }) });
    shown.forEach((member) => items.push({ type: 'member', key: member.userId, member }));
    if (total > shown.length) items.push({ type: 'more', key: 'more', total });
  }
  if (invites && open.data?.length) {
    items.push({ type: 'section', key: 's-invited', title: t('browse.invitedTitle') });
    open.data.forEach((invitation) => items.push({ type: 'invitation', key: invitation.id, invitation }));
  }
  if (leaves) items.push({ type: 'leave', key: 'leave' });

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.sm, gap: space.xxs }}>
            {name ? <Text variant="label" color="ink3">{name}</Text> : null}
            <Text variant="title" accessibilityRole="header">{t('browse.peopleTitle')}</Text>
            <Text variant="subhead" color="ink2">{t(of.kind === 'team' ? (team?.role === 'owner' ? 'browse.peopleTeamOwner' : invites ? 'browse.peopleTeamAdmin' : 'browse.peopleTeamOnly') : invites ? 'browse.peopleCanInvite' : 'browse.peopleOwnerOnly')}</Text>
            {invites && <InviteField of={of} outsiders={outsiders} />}
            {invites && <Text variant="footnote" color="ink3" style={{ marginTop: space.md }}>{t(of.kind === 'team' ? 'browse.inviteTeamHint' : 'browse.inviteListHint')}</Text>}
            {invites && of.kind === 'team' && team && <InviteLinkRow teamId={of.id} teamName={team.name} />}
            {(members.error || remove.error) && (
              <View style={{ marginTop: space.md }}>
                <Notice>{errorMessage(members.error ?? remove.error)}</Notice>
              </View>
            )}
          </View>
        );
      case 'section':
        return <Text variant="label" color="ink2" accessibilityRole="header" style={{ marginTop: space.xl, marginBottom: space.xs }}>{item.title}</Text>;
      case 'member':
        return <MemberRow of={of} team={team} member={item.member} />;
      case 'more':
        return <ListRow label={t('browse.seeAllPeople', { count: item.total })} onPress={() => navigation.navigate('Members', { ...of, name })} divider={false} />;
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
function InviteField({ of, outsiders }: { of: MembersOf; outsiders: UserRef[] }) {
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
      <PeoplePicker within={of} emailLabel={t('people.inviteByEmail')} onPickPerson={byPerson} onEmail={byEmail} busy={invite.isPending || invitePeople.isPending} />
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

/**
 * A team's invite link (D95, M84, the hub's A), for its owner and admins, under Invite by email: "Invite link · Expires
 * Oct 26" (or off); a tap opens Share, Copy, New link (the old one stops) and Turn off; off, Make a link.
 */
function InviteLinkRow({ teamId, teamName }: { teamId: Id; teamName: string }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const labels = useDateLabels(undefined);
  const state = useInviteLink(teamId, true);
  const { renew, turnOff } = useInviteLinkActions(teamId);
  const link = state.data?.link ?? null;
  const until = link ? labels.day(link.expiresAt.slice(0, 10)) : '';

  const share = (url: string) => Share.share({ message: t('people.link.shareMessage', { name: teamName, url }) });
  const make = () => renew.mutate(undefined, { onSuccess: (s) => s.link && share(s.link.url), onError: toastError });
  const menu = async () => {
    if (!link) return make();
    const actions = [
      { label: t('people.link.share'), icon: 'share' as const },
      { label: t('people.link.copy'), icon: 'copy' as const },
      { label: t('people.link.renew'), icon: 'refresh-cw' as const },
      { label: t('people.link.turnOff'), icon: 'x-circle' as const, destructive: true },
    ];
    const i = await chooseAction({ title: t('people.link.title', { date: until }), actions, cancelLabel: t('common.cancel') });
    if (i === 0) share(link.url);
    if (i === 1) {
      await Clipboard.setStringAsync(link.url);
      useToast.getState().show({ message: t('people.link.copied') });
    }
    if (i === 2) renew.mutate(undefined, { onSuccess: () => useToast.getState().show({ message: t('people.link.renewed') }), onError: toastError });
    if (i === 3) turnOff.mutate(undefined, { onSuccess: () => useToast.getState().show({ message: t('people.link.off') }), onError: toastError });
  };

  return (
    <View style={{ marginTop: space.md }}>
      <ListRow
        label={t('people.link.row')}
        icon={<Feather name="link-2" size={20} color={colors.accent} />}
        detail={state.isPending ? undefined : link ? t('people.link.on', { date: until }) : t('people.link.offDetail')}
        onPress={menu}
        busy={renew.isPending || turnOff.isPending}
        divider={false}
      />
    </View>
  );
}
