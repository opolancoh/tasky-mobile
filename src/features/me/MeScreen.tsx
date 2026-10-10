import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { zoneCity } from '@/core/dates/timeZones';
import { useMe } from '@/data/tenancy/queries';
import { Avatar } from '@/shared/components';
import { useReminderPermission } from '@/shared/notifications/reminders';
import { useSession } from '@/shared/session/SessionProvider';
import { confirm, ListRow, Screen, SectionLabel, SkeletonRow, Text, useTheme } from '@/shared/ui';

/**
 * Me (M39, M41), pushed from the avatar on Today and Activity: who the user is; Settings: name, time zone and language
 * (each a page that saves), email, change password, signed-in devices; Sign out (asks first).
 */
export function MeScreen() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const { signOut } = useSession();
  const navigation = useNavigation();
  const me = useMe().data;
  const permission = useReminderPermission((s) => s.status);
  const company = me?.tenant.type === 'organization' && !!me.tenant.name;

  const leave = async () => {
    if (await confirm({ title: t('me.signOutTitle'), confirmLabel: t('common.signOut'), cancelLabel: t('common.cancel') })) signOut();
  };

  if (!me) return <Screen edges={['bottom']}><SkeletonRow width={50} /></Screen>;
  return (
    <Screen scroll edges={['bottom']} contentStyle={{ paddingBottom: space.huge }}>
      <View style={[styles.head, { gap: space.md, paddingBottom: space.lg }]}>
        <Avatar name={me.displayName} seed={me.id} size={56} />
        <View style={styles.fill}>
          <Text variant="title" numberOfLines={1} accessibilityRole="header">{me.displayName}</Text>
          <Text variant="subhead" color="ink2" numberOfLines={1}>{me.email}</Text>
        </View>
      </View>

      <SectionLabel style={{ marginTop: space.sm }}>{t('me.profile')}</SectionLabel>
      <ListRow label={t('settings.name')} value={me.displayName} onPress={() => navigation.navigate('EditName')} />
      <ListRow label={t('me.timeZone')} value={zoneCity(me.timeZone)} onPress={() => navigation.navigate('TimeZone')} />
      <ListRow label={t('me.language')} value={t(`me.languages.${me.language}`, { defaultValue: me.language })} onPress={() => navigation.navigate('Language')} divider={!company} />
      {company ? <ListRow label={t('me.company')} value={me.tenant.name!} divider={false} /> : null}

      <SectionLabel>{t('settings.notifications')}</SectionLabel>
      <ListRow
        label={t('settings.reminders')}
        value={permission === 'unknown' ? undefined : t(permission === 'denied' ? 'settings.remindersOff' : 'settings.remindersOn')}
        detail={permission === 'denied' ? t('settings.remindersOffHint') : undefined}
        onPress={permission === 'denied' ? () => Linking.openSettings() : undefined}
        divider={false}
      />

      <SectionLabel>{t('settings.security')}</SectionLabel>
      <ListRow label={t('settings.email')} value={me.email} />
      <ListRow label={t('settings.changePassword')} onPress={() => navigation.navigate('ChangePassword')} />
      <ListRow label={t('settings.devices')} onPress={() => navigation.navigate('Sessions')} divider={false} />

      <Pressable onPress={leave} accessibilityRole="button" style={[styles.signOut, { gap: space.sm, marginTop: space.xxl }]}>
        {({ pressed }) => (
          <>
            <Feather name="log-out" size={17} color={colors.danger} />
            <Text variant="bodyMedium" color="danger" style={{ opacity: pressed ? 0.6 : 1 }}>{t('common.signOut')}</Text>
          </>
        )}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center' },
  signOut: { flexDirection: 'row', alignItems: 'center', minHeight: 44, alignSelf: 'flex-start' },
});
