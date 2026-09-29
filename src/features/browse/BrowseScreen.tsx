import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AddTaskRow, Screen, Text, useTheme } from '@/shared/ui';

/** Browse: Inbox, collections, tags, Completed, Recently Deleted. For now a shell for the tab bar. */
export function BrowseScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();

  return (
    <Screen edges={['top']}>
      <View style={{ paddingTop: space.xl }}>
        <Text variant="largeTitle">{t('browse.title')}</Text>
      </View>
      <Text variant="callout" color="ink2" style={{ marginTop: space.xxl }}>
        {t('browse.empty')}
      </Text>
      <View style={{ marginTop: 'auto' }}>
        <AddTaskRow label={t('quickAdd.row')} onPress={() => navigation.navigate('QuickAdd')} />
      </View>
    </Screen>
  );
}
