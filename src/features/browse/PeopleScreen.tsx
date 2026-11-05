import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { isApiError } from '@/core/http/problem';
import { newIdempotencyKey, sameInvitation, useNewInviteLink, useInvitePeople, useRevokeInvitation, useSendInvitation } from '@/data/tasks/mutations';
import { useInviteLink, useMembersPreview, useOpenInvitations, useTaskLists, useTasks, useTeams, useTeamSummary } from '@/data/tasks/queries';
import type { Member, MembersOf, OpenInvitation, Person, TeamRole, UserRef } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { Avatar, PeoplePicker } from '@/shared/components';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { errorMessage, toastError } from '@/shared/i18n/errors';
import { chooseAction, CountPill, ListRow, Notice, Screen, SectionLabel, Segmented, Skeleton, SkeletonRow, Spinner, Text, useDelayedFlag, useTheme, useToast } from '@/shared/ui';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';

import { canInvite } from './browseSections';
import { MemberRow } from './components/MemberRow';

type Item =
  | { type: 'header'; key: string }
  | { type: 'section'; key: string; title: string; count: number }
  | { type: 'member'; key: string; member: Member }
  | { type: 'more'; key: string; total: number }
  | { type: 'invitation'; key: string; invitation: OpenInvitation }
  | { type: 'skeleton'; key: string }
  | { type: 'note'; key: string };

/**
 * A team's or a list's people (M38, M146, as desktop's E62): under the title a team's open and late tasks in all (GET
 * /teams/{id}/summary), a list's people. In the team (or On the list) with a count pill: everyone and their role (Guest
 * for someone only in one of a team's lists); in a team each shows their open and late tasks there, and a tap opens those
 * tasks (M79); a manager long-presses someone for what their role allows (roles doc). Invited with Revoke. Invite in the
 * bar, for whoever invites (Owners, D125), opens Invite. Leaving is in the team's or list's •••.
 */
export function PeopleScreen({ route }: StaticScreenProps<MembersOf>) {
  const of: MembersOf = { kind: route.params.kind, id: route.params.id };
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const teams = useTeams().data ?? [];
  const taskLists = useTaskLists().data;
  const taskList = of.kind === 'taskList' ? taskLists?.find((c) => c.id === of.id) : undefined;
  const team = of.kind === 'team' ? teams.find((x) => x.id === of.id) : taskList?.team ? teams.find((x) => x.id === taskList.team!.id) : undefined;
  const inTeam = of.kind === 'team';
  const invites = inTeam ? team?.role === 'owner' : !!taskList && canInvite(taskList);
  // A team's list: its people are the team's, so Guests lists only people from outside on this list (M150).
  const guests = !inTeam && !!taskList?.team;
  // The first few (D105): you, the owners, then by when they joined; everyone only from See all.
  const members = useMembersPreview(of, !inTeam && !!taskList?.team);
  const open = useOpenInvitations(of, invites);
  const revoke = useRevokeInvitation(of);
  const summary = useTeamSummary(of.id, inTeam);
  const refreshControl = usePullRefresh(members, open, summary);
  const name = inTeam ? team?.name : taskList?.name;
  const total = members.data?.total ?? members.data?.items.length ?? 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      // ‹ Work, as desktop's back above the title: the team or list it came from (its screen has no title of its own).
      headerBackTitle: name,
      headerRight: invites
        ? () => (
            <Pressable onPress={() => navigation.navigate('Invite', of)} accessibilityRole="button" hitSlop={8} style={styles.invite}>
              <Text variant="button" color="accent">{t('browse.peoplePage.invite')}</Text>
            </Pressable>
          )
        : undefined,
    });
  });

  const items: Item[] = [{ type: 'header', key: 'header' }];
  if (members.isPending) items.push({ type: 'skeleton', key: 'k' });
  else {
    const shown = members.data?.items ?? [];
    if (guests && !total) items.push({ type: 'note', key: 'none' });
    else items.push({ type: 'section', key: 's-people', title: t(inTeam ? 'browse.peoplePage.inTeam' : 'browse.peoplePage.onList'), count: total });
    shown.forEach((member) => items.push({ type: 'member', key: member.userId, member }));
    if (total > shown.length) items.push({ type: 'more', key: 'more', total });
  }
  if (invites && open.data?.length) {
    items.push({ type: 'section', key: 's-invited', title: t('browse.invitedTitle'), count: open.data.length });
    open.data.forEach((invitation) => items.push({ type: 'invitation', key: invitation.id, invitation }));
  }

  const line = guests ? <Text variant="subhead" color="ink2">{t('browse.peoplePage.guestsLine', { team: taskList?.team?.name })}</Text>
    : !inTeam ? (members.isPending ? null : <Text variant="subhead" color="ink2">{t('browse.people', { count: total })}</Text>)
    : summary.data ? (
      <Text variant="subhead" color="ink2">
        {t('people.openCount', { count: summary.data.open })}
        {summary.data.late > 0 && <>{' · '}<Text variant="subhead" color="danger">{t('people.lateCount', { count: summary.data.late })}</Text></>}
        {` ${t('browse.peoplePage.acrossTeam')}`}
      </Text>
    ) : null;

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ paddingBottom: space.sm, gap: space.xxs }}>
            <Text variant="largeTitle" accessibilityRole="header">{t(guests ? 'browse.peoplePage.guestsTitle' : 'browse.peopleTitle')}</Text>
            {line}
            {members.error && (
              <View style={{ marginTop: space.md }}>
                <Notice>{errorMessage(members.error)}</Notice>
              </View>
            )}
          </View>
        );
      case 'section':
        return (
          <View style={[styles.section, { gap: space.xs, marginTop: space.xl, marginBottom: space.xs }]}>
            <Text variant="label" color="ink2" accessibilityRole="header">{item.title}</Text>
            {item.count > 0 && <CountPill count={item.count} />}
            {inTeam && item.key === 's-people' && (
              <Pressable onPress={() => navigation.navigate('TeamRoles')} accessibilityRole="button" accessibilityLabel={t('teamRoles.open')} hitSlop={10}>
                <Feather name="info" size={15} color={colors.ink3} />
              </Pressable>
            )}
          </View>
        );
      case 'member':
        return <MemberRow of={of} team={team} member={item.member} />;
      case 'more':
        return <ListRow label={t('browse.seeAllPeople', { count: item.total })} onPress={() => navigation.navigate('Members', { ...of, name, guests })} divider={false} />;
      case 'note':
        return <Text variant="footnote" color="ink3" style={{ marginTop: space.lg }}>{t('browse.peoplePage.noGuests')}</Text>;
      case 'invitation':
        return <InvitationRow invitation={item.invitation} guest={guests} onRevoke={() => revoke.mutate(item.invitation.id)} revoking={revoke.isPending} />;
      case 'skeleton':
        return <SkeletonRow width={50} />;
    }
  };

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <FlashList
        refreshControl={refreshControl}
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
 * Invite (M146), from People's bar: a screen of its own over People with the field (people or an email), what joining
 * means and, in a team, its invite link. Done closes it. The first invitation of a private list with tasks given outside
 * it asks about those people (D88, M71).
 */
export function InviteScreen({ route }: StaticScreenProps<MembersOf>) {
  const of: MembersOf = { kind: route.params.kind, id: route.params.id };
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const teams = useTeams().data ?? [];
  const taskLists = useTaskLists().data;
  const taskList = of.kind === 'taskList' ? taskLists?.find((c) => c.id === of.id) : undefined;
  const team = of.kind === 'team' ? teams.find((x) => x.id === of.id) : undefined;
  const name = of.kind === 'team' ? team?.name : taskList?.name;
  const open = useOpenInvitations(of, true);
  // Joins as (D126); a guest of a team's list is always a guest, so no choice there.
  const guest = !!taskList?.team;
  const [role, setRole] = useState<TeamRole>('member');
  const privateList = !!taskList && taskList.sharing === 'private';
  const listTasks = useTasks({ taskListId: of.id, sort: 'taskList' }, privateList);
  const outsiders = privateList && !open.data?.length
    ? [...new Map((listTasks.data?.items ?? []).filter((x) => x.assignee && x.assignee.id !== me?.id).map((x) => [x.assignee!.id, x.assignee!])).values()]
    : [];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: name ? t('browse.peoplePage.inviteTitle', { name }) : t('browse.peoplePage.invite'),
      headerRight: () => (
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" hitSlop={8} style={styles.invite}>
          <Text variant="button" color="accent">{t('common.done')}</Text>
        </Pressable>
      ),
    });
  });

  return (
    <Screen edges={['bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.huge }}>
        {/* Two ways in, each under its own heading: by name or email (with the role, D126), and a team's link. */}
        <SectionLabel style={{ marginTop: 0 }}>{t('browse.peoplePage.byEmail')}</SectionLabel>
        {!guest && (
          <View style={{ gap: space.sm, marginBottom: space.sm }}>
            <Text variant="label" color="ink2">{t('browse.peoplePage.joinsAs')}</Text>
            <Segmented<TeamRole> accessibilityLabel={t('browse.peoplePage.joinsAs')} options={(['member', 'owner'] as const).map((r) => ({ value: r, label: t(`browse.role.${r}`) }))} value={role} onChange={setRole} />
            <Text variant="footnote" color="ink3">
              {`${t(role === 'owner' ? 'browse.peoplePage.means.owner' : of.kind === 'team' ? 'browse.peoplePage.means.memberTeam' : 'browse.peoplePage.means.memberList', { name })} ${t('browse.peoplePage.lasts')}`}
            </Text>
          </View>
        )}
        <InviteField of={of} name={name ?? ''} outsiders={outsiders} role={guest ? undefined : role} />
        {guest && <Text variant="footnote" color="ink3" style={{ marginTop: space.md }}>{t('browse.peoplePage.guestHint', { team: taskList?.team?.name })}</Text>}
        {of.kind === 'team' && team && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.line, marginTop: space.xxl }]} />
            <InviteLinkSection teamId={of.id} teamName={team.name} />
            <View style={[styles.divider, { backgroundColor: colors.line, marginTop: space.xxl }]} />
            <Text variant="footnote" color="ink3" style={{ marginTop: space.lg }}>{t('browse.peoplePage.guestsNote', { name: team.name })}</Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * Invite (M56, M73, M116): find someone the user works with, or a colleague (GET /people, D89), or type an email for
 * someone new. A pick or an email sent clears the field and joins Invited at once, sending; the keyboard stays up for the
 * next. An error shows under the field with the email back in it (if still empty; otherwise a toast), and sending that
 * email again reuses its Idempotency-Key. Someone already in it shows greyed in the results (D128), or reads as a hint. The first invitation of a private list
 * with tasks given outside it asks about those people first (D88, M71).
 */
function InviteField({ of, name: inName, outsiders, role }: { of: MembersOf; name: string; outsiders: UserRef[]; role?: TeamRole }) {
  const { t } = useTranslation();
  const { space } = useTheme();
  const send = useSendInvitation(of);
  const invitePeople = useInvitePeople(of);
  const open = useOpenInvitations(of, true).data;
  const [problem, setProblem] = useState<{ message: string; hint: boolean } | null>(null);
  const [failed, setFailed] = useState<{ email: string; key: string } | null>(null);

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

  const invite = async (to: { email: string } | { person: Person }, restore: () => boolean) => {
    const target = 'person' in to ? { person: { id: to.person.id, displayName: to.person.displayName } } : { email: to.email };
    const name = 'person' in to ? to.person.displayName : to.email;
    const previous = sameInvitation(open, { key: '', ...target });
    if (previous?.sending) return;
    setProblem(null);
    const yes = await askAboutOutsiders();
    if (yes === null) return void restore();
    const key = 'email' in target && failed && failed.email === target.email ? failed.key : newIdempotencyKey();
    try {
      await send.mutateAsync({ key, role, ...target });
      setFailed(null);
      // The sheet stays open for the next one; the toast says it went (Done shows it under Invited).
      useToast.getState().show({ message: t(previous ? 'browse.invitedAgain' : 'browse.invited', { email: name }) });
      alsoThem(yes, 'person' in to ? to.person.id : null);
    } catch (error) {
      const hint = isApiError(error) && error.code === 'sharing.already_member';
      if ('person' in to) return setProblem({ message: hint ? errorMessage(error) : t('browse.inviteFailed', { name, reason: errorMessage(error) }), hint });
      if (hint) return setProblem({ message: errorMessage(error), hint });
      setFailed({ email: to.email, key });
      if (restore()) setProblem({ message: errorMessage(error), hint });
      else toastError(error);
    }
  };
  return (
    <View style={{ marginTop: space.lg, gap: space.xs }}>
      <PeoplePicker
        within={of}
        emailLabel={t('people.inviteByEmail')}
        emailAction={(email) => ({ label: t('people.inviteEmail', { email }), detail: t('people.inviteEmailDetail') })}
        onPickPerson={(person, restore) => invite({ person }, restore)}
        onEmail={(email, restore) => invite({ email }, restore)}
        keepsKeyboard
        invite={{ name: inName, invited: (p) => !!open?.some((x) => x.invitee?.id === p.id || x.email.toLowerCase() === p.email.toLowerCase()) }}
      />
      {problem && (
        <Text variant="footnote" color={problem.hint ? 'ink2' : 'danger'} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {problem.message}
        </Text>
      )}
    </View>
  );
}

/** An open invitation (M56): the person's name when the email has an account, else the email; while sending, a ring after 300 ms (M116) in place of Revoke. */
function InvitationRow({ invitation, guest, onRevoke, revoking }: { invitation: OpenInvitation; guest: boolean; onRevoke: () => void; revoking: boolean }) {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const me = useMe().data;
  const ring = useDelayedFlag(!!invitation.sending);
  const v = invitation;
  const expires = me && !v.sending ? formatInstant(v.expiresAt, i18n.language, me.timeZone, { month: 'short', day: 'numeric' }) : '';
  return (
    <View style={[styles.row, { gap: space.md, borderBottomColor: colors.line }]} accessibilityState={{ busy: !!v.sending }}>
      {v.invitee ? (
        <Avatar name={v.invitee.displayName} seed={v.invitee.id} size={30} />
      ) : (
        <View style={[styles.mail, { backgroundColor: colors.surface2 }]}>
          <Feather name="mail" size={14} color={colors.ink2} />
        </View>
      )}
      <View style={styles.fill}>
        <Text variant="body" numberOfLines={1}>{v.invitee?.displayName ?? v.email}</Text>
        <Text variant="footnote" color="ink3">{`${t(guest ? 'browse.role.guest' : `browse.role.${v.role}`)} · ${v.sending ? t('browse.sending') : t('browse.expires', { date: expires })}`}</Text>
      </View>
      {v.sending ? (
        <View style={styles.send}>{ring && <Spinner size={16} accessibilityLabel={t('browse.sending')} />}</View>
      ) : (
        <Pressable onPress={onRevoke} disabled={revoking} accessibilityRole="button" style={styles.send}>
          <Text variant="label" color="ink2">{t('browse.revoke')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  linkField: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingLeft: 12, paddingRight: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  linkCopy: { flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 12, borderRadius: 10 },
  fill: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  mail: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  section: { flexDirection: 'row', alignItems: 'center' },
  invite: { minHeight: 44, justifyContent: 'center' },
  send: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  tile: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth },
});

/**
 * A team's invite link (D95, M84, M155, D126), for its Owners: "Or share a link" with ••• (Share, New link: the old one
 * stops at once), what the link does, then the address in a read-only field with Copy beside it and when it expires under;
 * while it loads, that shape in grey so the sheet doesn't grow. Off: "Make an invite link" with +, which makes one and
 * opens Share.
 */
function InviteLinkSection({ teamId, teamName }: { teamId: Id; teamName: string }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const labels = useDateLabels(undefined);
  const state = useInviteLink(teamId, true);
  const renew = useNewInviteLink(teamId);
  const link = state.data?.link ?? null;

  const share = (url: string) => Share.share({ message: t('people.link.shareMessage', { name: teamName, url }) });
  const copy = async (url: string) => {
    await Clipboard.setStringAsync(url);
    useToast.getState().show({ message: t('people.link.copied') });
  };
  const make = () => renew.mutate(undefined, { onSuccess: (s) => s.link && share(s.link.url), onError: toastError });
  const more = async () => {
    if (!link) return;
    const actions = [
      { label: t('people.link.share'), icon: 'share' as const },
      { label: t('people.link.renew'), icon: 'refresh-cw' as const },
    ];
    const i = await chooseAction({ title: t('people.link.row'), actions, cancelLabel: t('common.cancel') });
    if (i === 0) share(link.url);
    if (i === 1) renew.mutate(undefined, { onSuccess: () => useToast.getState().show({ message: t('people.link.renewed') }), onError: toastError });
  };
  const tile = (
    <View style={[styles.tile, { backgroundColor: colors.accentSoft }]}>
      <Feather name="link-2" size={20} color={colors.accent} />
    </View>
  );

  return (
    <>
      <SectionLabel action={link ? { icon: 'more-horizontal', label: t('people.link.row'), onPress: more } : undefined}>{t('browse.peoplePage.linkTitle')}</SectionLabel>
      <Text variant="footnote" color="ink3" style={{ marginBottom: space.sm }}>{t('browse.peoplePage.linkAbout')}</Text>
      {state.isPending ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.linkField, { gap: space.sm, borderColor: colors.line, backgroundColor: colors.surface2 }]}>
            <Skeleton width="60%" height={14} />
            <View style={styles.fill} />
            <Skeleton width={78} height={34} radius={10} />
          </View>
          <Skeleton width="35%" height={10} style={{ marginTop: space.sm }} />
        </View>
      ) : link ? (
        <View>
          <View style={[styles.linkField, { gap: space.sm, borderColor: colors.line, backgroundColor: colors.surface2 }]}>
            <Feather name="link-2" size={16} color={colors.ink3} />
            <Text variant="subhead" numberOfLines={1} ellipsizeMode="middle" selectable style={styles.fill}>{link.url.replace(/^https?:\/\//, '')}</Text>
            <Pressable
              onPress={() => void copy(link.url)}
              disabled={renew.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('people.link.copyRow')}
              style={({ pressed }) => [styles.linkCopy, { gap: space.xs, backgroundColor: pressed ? colors.accentPressed : colors.accent }]}
            >
              <Feather name="copy" size={15} color={colors.onAccent} />
              <Text variant="label" style={{ color: colors.onAccent }}>{t('people.link.copy')}</Text>
            </Pressable>
          </View>
          <Text variant="footnote" color="ink3" style={{ marginTop: space.xs }}>{t('people.link.expires', { date: labels.day(link.expiresAt.slice(0, 10)) })}</Text>
        </View>
      ) : (
        <ListRow
          label={t('people.link.make')}
          detail={t('people.link.makeDetail')}
          icon={tile}
          accessory={<Feather name="plus" size={22} color={colors.accent} />}
          onPress={make}
          chevron={false}
          busy={renew.isPending}
          divider={false}
        />
      )}
    </>
  );
}
