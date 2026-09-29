import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen, Text, useTheme } from '@/shared/ui';

/** Upcoming (GET /views/upcoming): the next 7 days, then Later. For now a shell for the tab bar. */
export function UpcomingScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();

  return (
    <Screen edges={['top']}>
      <View style={{ paddingTop: space.xl, gap: space.xxs }}>
        <Text variant="label" color="ink3">
          {t('upcoming.eyebrow')}
        </Text>
        <Text variant="largeTitle">{t('upcoming.title')}</Text>
      </View>
      <Text variant="callout" color="ink2" style={{ marginTop: space.xxl }}>
        {t('upcoming.empty')}
      </Text>
    </Screen>
  );
}
