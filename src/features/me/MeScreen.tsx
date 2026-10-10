import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useMe } from '@/data/tenancy/queries';
import { Avatar } from '@/shared/components';
import { useSession } from '@/shared/session/SessionProvider';
import { confirm, ListRow, Screen, SectionLabel, SkeletonRow, Text, useTheme } from '@/shared/ui';

/**
 * Me (M39), pushed from the avatar on Today and Activity: who the user is (name, email), their profile (time zone,
 * language) and Sign out. Editing them, changing the password and the signed-in devices come next (Settings).
 */
export function MeScreen() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const { signOut } = useSession();
  const me = useMe().data;

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
      <ListRow label={t('me.timeZone')} value={me.timeZone.replace(/_/g, ' ')} />
      <ListRow label={t('me.language')} value={t(`me.languages.${me.language}`, { defaultValue: me.language })} />
      {me.tenant.type === 'organization' && me.tenant.name ? <ListRow label={t('me.company')} value={me.tenant.name} /> : null}
      <Text variant="footnote" color="ink3" style={{ marginTop: space.sm }}>{t('me.editLater')}</Text>

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
