import { Feather } from '@expo/vector-icons';
import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { useAnswerInvitation } from '@/data/tasks/mutations';
import { useInvitations } from '@/data/tasks/queries';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { confirm, ListRow, Notice, Screen, space, Text, useTheme, useToast } from '@/shared/ui';

/**
 * An invitation (06-mobile.md, M34), pushed from its Needs attention row: who invited, the people, the open tasks
 * (a collection) or lists (a team), when it expires, and what joining shows. **Join** in the header, where Save goes;
 * **Decline invitation** as red text at the end (D68). Either answer goes back.
 */
export function InvitationScreen({ route }: StaticScreenProps<{ invitationId: Id }>) {
  const { invitationId } = route.params;
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const invitations = useInvitations();
  const answer = useAnswerInvitation();
  const invitation = invitations.data?.find((x) => x.id === invitationId);

  const respond = async (join: boolean) => {
    if (!invitation) return;
    if (!join) {
      const ok = await confirm({ title: t('invitation.declineTitle', { name: invitation.name }), message: t('invitation.declineMessage'), confirmLabel: t('invitation.decline'), cancelLabel: t('common.cancel') });
      if (!ok) return;
    }
    answer.mutate(
      { id: invitation.id, join },
      {
        onSuccess: () => {
          navigation.goBack();
          useToast.getState().show({ message: join ? t('today.joined', { name: invitation.name }) : t('today.declined') });
        },
      },
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: invitation
        ? () => (
            <Pressable onPress={() => respond(true)} disabled={answer.isPending} hitSlop={8} accessibilityRole="button" style={styles.headerButton}>
              {({ pressed }) => (
                <Text variant="button" color={answer.isPending ? 'ink3' : 'accent'} style={{ opacity: pressed ? 0.6 : 1 }}>
                  {t('invitation.join')}
                </Text>
              )}
            </Pressable>
          )
        : undefined,
    });
  });

  if (!invitation) {
    return (
      <Screen edges={['bottom']}>
        {invitations.error ? <Notice>{errorMessage(invitations.error)}</Notice> : invitations.data ? <Text variant="subhead" color="ink2">{t('invitation.gone')}</Text> : null}
      </Screen>
    );
  }

  const team = !!invitation.teamId;
  const expires = me ? formatInstant(invitation.expiresAt, i18n.language, me.timeZone, { month: 'short', day: 'numeric' }) : '';

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ paddingBottom: space.huge }}>
      {answer.error && (
        <View style={{ marginBottom: space.md }}>
          <Notice>{errorMessage(answer.error)}</Notice>
        </View>
      )}
      <View style={{ gap: space.xxs, paddingBottom: space.lg }}>
        {invitation.invitedBy?.displayName ? (
          <Text variant="label" color="ink3">{t('invitation.invitedYou', { name: invitation.invitedBy.displayName })}</Text>
        ) : null}
        <Text variant="title" accessibilityRole="header">{invitation.name}</Text>
        <Text variant="subhead" color="ink2">{t(team ? 'invitation.team' : 'invitation.sharedList')}</Text>
      </View>

      <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }}>
        {invitation.invitedBy?.displayName ? <ListRow label={t('invitation.invitedBy')} value={invitation.invitedBy.displayName} /> : null}
        <ListRow label={t('invitation.people')} value={String(invitation.people)} />
        <ListRow label={t(team ? 'invitation.lists' : 'invitation.openTasks')} value={String((team ? invitation.lists : invitation.openTasks) ?? 0)} />
        <ListRow label={t('invitation.expires')} value={expires} divider={false} />
      </View>

      <Text variant="footnote" color="ink2" style={{ marginTop: space.md }}>
        {t(team ? 'invitation.noteTeam' : 'invitation.noteList')}
      </Text>

      <Pressable onPress={() => respond(false)} disabled={answer.isPending} accessibilityRole="button" style={[styles.decline, { gap: space.sm, marginTop: space.xxl }]}>
        {({ pressed }) => (
          <>
            <Feather name="x-circle" size={17} color={colors.danger} />
            <Text variant="bodyMedium" color="danger" style={{ opacity: pressed || answer.isPending ? 0.6 : 1 }}>
              {t('invitation.decline')}
            </Text>
          </>
        )}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButton: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  decline: { flexDirection: 'row', alignItems: 'center', minHeight: 44, alignSelf: 'flex-start' },
});
