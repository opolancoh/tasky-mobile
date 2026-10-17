import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import { isEmail } from '@/core/validation/rules';
import { useInvite, useInviteAssignees, useRemoveMember, useRevokeInvitation } from '@/data/tasks/mutations';
import { useTaskLists, useMembers, useOpenInvitations, useTasks, useTeams } from '@/data/tasks/queries';
import type { Member, MembersOf, OpenInvitation, UserRef } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { Avatar } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { chooseAction, confirm, Notice, Screen, SkeletonRow, Text, TextButton, useTheme, useToast } from '@/shared/ui';

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
 * Leave at the end for whoever may (asks first).
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

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.sm, gap: space.xxs }}>
            {name ? <Text variant="label" color="ink3">{name}</Text> : null}
            <Text variant="title" accessibilityRole="header">{t('browse.peopleTitle')}</Text>
            <Text variant="subhead" color="ink2">{t(invites ? 'browse.peopleCanInvite' : of.kind === 'team' ? 'browse.peopleTeamOnly' : 'browse.peopleOwnerOnly')}</Text>
            {invites && <InviteField of={of} outsiders={outsiders} />}
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
        return (
          <View style={[styles.row, { gap: space.md, borderBottomColor: colors.line }]}>
            <Avatar name={m.displayName} seed={m.userId} />
            <Text variant="body" numberOfLines={1} style={styles.fill}>{m.userId === me?.id ? t('browse.you', { name: m.displayName }) : m.displayName}</Text>
            <Text variant="subhead" color="ink3">{roleOf(m)}</Text>
          </View>
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
 * Invite by email (M56): the typed text lives here, not in the screen (docs/performance.md). Invite waits for an email,
 * then for the API: busy at once, a spinner after 300 ms, while the field stays editable and the keyboard up. Success
 * clears the field (unless it changed meanwhile) for the next person; errors show under it, until the next keystroke.
 */
function InviteField({ of, outsiders }: { of: MembersOf; outsiders: UserRef[] }) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const invite = useInvite(of);
  const inviteThem = useInviteAssignees(of.id);
  const [email, setEmail] = useState('');
  const valid = isEmail(email.trim());
  const change = (text: string) => {
    setEmail(text);
    if (invite.error) invite.reset();
  };
  const send = async () => {
    const value = email.trim();
    if (!isEmail(value) || invite.isPending) return;
    // People with a task given from this list (D88): invite them too, or keep them seeing only their task.
    let alsoThem = false;
    if (outsiders.length) {
      const names = outsiders.map((p) => p.displayName.split(' ')[0]).join(', ');
      const choice = await chooseAction({
        title: t('browse.shareOutside.title', { names, count: outsiders.length }),
        actions: [{ label: t('browse.shareOutside.invite', { count: outsiders.length }), icon: 'user-plus' }, { label: t('browse.shareOutside.keep', { count: outsiders.length }), icon: 'user' }],
        cancelLabel: t('common.cancel'),
      });
      if (choice === null) return;
      alsoThem = choice === 0;
    }
    invite.mutate(value, {
      onSuccess: ({ again }) => {
        setEmail((current) => (current.trim() === value ? '' : current));
        useToast.getState().show({ message: t(again ? 'browse.invitedAgain' : 'browse.invited', { email: value }) });
        if (alsoThem) inviteThem.mutate(outsiders.map((p) => p.id));
      },
    });
  };
  return (
    <View style={{ marginTop: space.lg, gap: space.xs }}>
      <View style={[styles.invite, { gap: space.sm, borderBottomColor: invite.error ? colors.danger : colors.accent }]}>
        <TextInput
          value={email}
          onChangeText={change}
          placeholder={t('browse.invitePlaceholder')}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="send"
          submitBehavior="submit"
          onSubmitEditing={send}
          accessibilityLabel={t('browse.inviteLabel')}
          style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }]}
        />
        <TextButton label={t('browse.invite')} onPress={send} disabled={!valid} busy={invite.isPending} />
      </View>
      {invite.error && (
        <Text variant="footnote" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {errorMessage(invite.error)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  invite: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5 },
  input: { flex: 1, minHeight: 44, paddingVertical: 10 },
  send: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  mail: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  leave: { flexDirection: 'row', alignItems: 'center', minHeight: 44, alignSelf: 'flex-start' },
});
