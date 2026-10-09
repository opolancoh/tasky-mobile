import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useSession } from '@/shared/session/SessionProvider';
import { Button, Screen, Text, useTheme } from '@/shared/ui';

/** Search (GET /search?q=): titles, notes and steps, accents ignored. For now a shell, with Sign out until Settings exists. */
export function SearchScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const { signOut } = useSession();

  return (
    <Screen edges={['top']}>
      <View style={{ paddingTop: space.xl }}>
        <Text variant="largeTitle">{t('search.title')}</Text>
      </View>
      <Text variant="callout" color="ink2" style={{ marginTop: space.xxl }}>
        {t('search.empty')}
      </Text>
      <View style={{ alignItems: 'center', paddingVertical: space.xxl }}>
        <Button variant="link" title={t('common.signOut')} onPress={signOut} />
      </View>
    </Screen>
  );
}
