import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { appInfo } from '@/shared/appInfo';
import { Button, Logo, Screen, Text, useTheme } from '@/shared/ui';

/**
 * Shown instead of everything else once the API answers 426 (M48): this version is too old (X-Client below the
 * minimum). Update opens where testers get builds; the session is kept for the new version.
 */
export function UpdateRequiredScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: space.md }}>
        <View style={{ marginBottom: space.xl }}>
          <Logo />
        </View>
        <Text variant="title">{t('session.update.title')}</Text>
        <Text variant="callout" color="ink2">
          {t('session.update.body', { version: appInfo.version })}
        </Text>
      </View>
      <View style={{ paddingBottom: space.lg }}>
        <Button title={t('session.update.action')} onPress={() => Linking.openURL(appInfo.updateUrl).catch(() => undefined)} />
      </View>
    </Screen>
  );
}
