import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatLocalDate, todayIn } from '@/core/dates/localDate';
import { useMe } from '@/data/tenancy/queries';
import { useSession } from '@/shared/session/SessionProvider';
import { Button, Screen, Text, useTheme } from '@/shared/ui';

/**
 * Today (GET /views/today). For now a shell that proves the session: the date in the profile's
 * time zone and, until Settings exists, sign-out.
 */
export function TodayScreen() {
  const { t, i18n } = useTranslation();
  const { space } = useTheme();
  const { signOut } = useSession();
  const me = useMe().data;

  const today = me ? formatLocalDate(todayIn(me.timeZone), i18n.language, { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  return (
    <Screen edges={['top']}>
      <View style={{ paddingTop: space.xl, gap: space.xxs }}>
        <Text variant="label" color="ink3">
          {today}
        </Text>
        <Text variant="largeTitle">{t('today.title')}</Text>
      </View>
      <Text variant="callout" color="ink2" style={{ marginTop: space.xxl }}>
        {t('today.empty')}
      </Text>
      <View style={{ marginTop: 'auto', paddingBottom: space.lg, alignItems: 'center' }}>
        <Button variant="link" title={t('today.signOut')} onPress={signOut} />
      </View>
    </Screen>
  );
}
