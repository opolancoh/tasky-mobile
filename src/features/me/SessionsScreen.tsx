import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import { useRevokeSession, useSessions } from '@/data/identity/queries';
import type { SessionInfo } from '@/data/identity/types';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { useSession } from '@/shared/session/SessionProvider';
import { confirm, Notice, Screen, SkeletonRow, Text, useTheme, useToast } from '@/shared/ui';

/**
 * Settings › Signed-in devices (M41): every device where the user is signed in, this one first; Sign out on another
 * device, and Sign out of all devices (this one too) at the end. Both ask first.
 */
export function SessionsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const me = useMe().data;
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const { signOutEverywhere } = useSession();
  const list = [...(sessions.data ?? [])].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));
  const when = (iso: string) => (me ? formatInstant(iso, i18n.language, me.timeZone, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

  const signOutDevice = async (s: SessionInfo) => {
    const ok = await confirm({ title: t('settings.signOutDeviceTitle', { device: s.deviceName }), confirmLabel: t('common.signOut'), cancelLabel: t('common.cancel') });
    if (ok) revoke.mutate(s.id, { onSuccess: () => useToast.getState().show({ message: t('settings.deviceSignedOut', { device: s.deviceName }) }) });
  };
  const signOutAll = async () => {
    const ok = await confirm({ title: t('settings.signOutAllTitle'), message: t('settings.signOutAllBody'), confirmLabel: t('settings.signOutAll'), cancelLabel: t('common.cancel') });
    if (ok) await signOutEverywhere().catch((e) => useToast.getState().show({ message: errorMessage(e) }));
  };

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <FlashList
        data={list}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <View style={{ gap: space.xxs, paddingBottom: space.md }}>
            <Text variant="title" accessibilityRole="header">{t('settings.devices')}</Text>
            <Text variant="subhead" color="ink2">{t('settings.devicesHint')}</Text>
            {(sessions.error || revoke.error) && <View style={{ marginTop: space.md }}><Notice>{errorMessage(sessions.error ?? revoke.error)}</Notice></View>}
            {sessions.isPending && <SkeletonRow width={60} />}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { gap: space.md, borderBottomColor: colors.line }]}>
            <Feather name={/ios|android|phone|mobile/i.test(item.deviceType) ? 'smartphone' : 'monitor'} size={20} color={colors.ink2} />
            <View style={styles.fill}>
              <Text variant="body" numberOfLines={1}>{item.deviceName}</Text>
              <Text variant="footnote" color={item.isCurrent ? 'success' : 'ink3'} numberOfLines={1}>
                {item.isCurrent ? t('settings.thisDeviceNow') : t('settings.lastUsed', { when: when(item.lastUsedAt) })}
              </Text>
            </View>
            {!item.isCurrent && (
              <Pressable onPress={() => signOutDevice(item)} disabled={revoke.isPending} accessibilityRole="button" style={styles.action}>
                <Text variant="label" color="danger">{t('common.signOut')}</Text>
              </Pressable>
            )}
          </View>
        )}
        ListFooterComponent={
          list.length ? (
            <Pressable onPress={signOutAll} accessibilityRole="button" style={[styles.all, { gap: space.sm, marginTop: space.xxl }]}>
              <Feather name="log-out" size={17} color={colors.danger} />
              <Text variant="bodyMedium" color="danger">{t('settings.signOutAll')}</Text>
            </Pressable>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth },
  action: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  all: { flexDirection: 'row', alignItems: 'center', minHeight: 44, alignSelf: 'flex-start' },
});
