import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import { isEmail } from '@/core/validation/rules';
import { useInvite, useRemoveMember, useRevokeInvitation } from '@/data/tasks/mutations';
import { useCollections, useMembers, useOpenInvitations, useTeams } from '@/data/tasks/queries';
import type { Member, MembersOf, OpenInvitation } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { Avatar } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { confirm, Notice, Screen, SkeletonRow, Text, useTheme, useToast } from '@/shared/ui';

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
  const collections = useCollections().data;
  const collection = of.kind === 'collection' ? collections?.find((c) => c.id === of.id) : undefined;
  const team = of.kind === 'team' ? teams.find((x) => x.id === of.id) : collection?.team ? teams.find((x) => x.id === collection.team!.id) : undefined;
  const invites = of.kind === 'team' ? !!team && team.role !== 'member' : !!collection && canInvite(collection, team);
  const leaves = of.kind === 'team' ? !!team && team.role !== 'owner' : !!collection && canLeave(collection, team, me?.id);
  const members = useMembers(of);
  const open = useOpenInvitations(of, invites);
  const revoke = useRevokeInvitation(of);
  const remove = useRemoveMember();
  const name = of.kind === 'team' ? team?.name : collection?.name;

  const leave = async () => {
    if (!me || !name) return;
    const ok = await confirm({ title: t('browse.leaveTitle', { name }), message: t(of.kind === 'team' ? 'browse.leaveTeamBody' : 'browse.leaveListBody', { name: collection?.owner.displayName }), confirmLabel: t(of.kind === 'team' ? 'browse.menu.leaveTeam' : 'browse.menu.leaveList'), cancelLabel: t('common.cancel') });
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
            {invites && <InviteField of={of} />}
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

/** Invite by email: the typed text lives here, not in the screen (docs/performance.md). Invalid until it's an email. */
function InviteField({ of }: { of: MembersOf }) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const invite = useInvite(of);
  const [email, setEmail] = useState('');
  const valid = isEmail(email.trim());
  const send = () => {
    const value = email.trim();
    if (!isEmail(value)) return;
    invite.mutate(value, { onSuccess: () => { setEmail(''); useToast.getState().show({ message: t('browse.invited', { email: value }) }); } });
  };
  return (
    <View style={{ marginTop: space.lg, gap: space.xs }}>
      <View style={[styles.invite, { gap: space.sm, borderBottomColor: invite.error ? colors.danger : colors.accent }]}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t('browse.invitePlaceholder')}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={send}
          accessibilityLabel={t('browse.inviteLabel')}
          style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }]}
        />
        <Pressable onPress={send} disabled={!valid || invite.isPending} accessibilityRole="button" style={styles.send}>
          <Text variant="button" color={valid && !invite.isPending ? 'accent' : 'ink3'}>{t('browse.invite')}</Text>
        </Pressable>
      </View>
      {invite.error && <Text variant="footnote" color="danger">{errorMessage(invite.error)}</Text>}
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
