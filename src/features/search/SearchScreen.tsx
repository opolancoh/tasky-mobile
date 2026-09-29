import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen, Text, useTheme } from '@/shared/ui';

/** Search (GET /search?q=): titles, notes and steps, accents ignored. No add row here (M11). For now a shell. */
export function SearchScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();

  return (
    <Screen edges={['top']}>
      <View style={{ paddingTop: space.xl }}>
        <Text variant="largeTitle">{t('search.title')}</Text>
      </View>
      <Text variant="callout" color="ink2" style={{ marginTop: space.xxl }}>
        {t('search.empty')}
      </Text>
    </Screen>
  );
}
