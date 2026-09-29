import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Text, useTheme } from '@/shared/ui';

/**
 * Quick add (POST /tasks), a form sheet over the tabs. For now a shell so the add row has somewhere
 * to go; the form (title with #tags, due date, priority, collection) comes with the Quick add design.
 */
export function QuickAddSheet() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={{ backgroundColor: colors.surface, paddingHorizontal: space.lg, paddingBottom: space.huge }}>
      <View style={styles.bar}>
        <Button variant="link" title={t('quickAdd.cancel')} onPress={() => navigation.goBack()} />
        <Text variant="headline">{t('quickAdd.title')}</Text>
        <View style={styles.side} />
      </View>
      <Text variant="callout" color="ink2" style={{ marginTop: space.md }}>
        {t('quickAdd.comingSoon')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginTop: 8 },
  side: { minWidth: 56 },
});
