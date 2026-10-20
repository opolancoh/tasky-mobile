import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { systemApi } from '@/data/system/api';
import { useApiVersion } from '@/data/system/queries';
import { useMe } from '@/data/tenancy/queries';
import { appInfo } from '@/shared/appInfo';
import { useErrorReports } from '@/shared/errors/errorReports';
import { useNetworkLog } from '@/shared/network/networkLog';
import { usePushToken } from '@/shared/notifications/push';
import { ListRow, Screen, SectionLabel, Text, useTheme, useToast } from '@/shared/ui';

/**
 * Me › About (M48): this app's version and build ("0.2.0 (14)", or Expo Go), and the API's version and server, so a
 * tester can say exactly what they are running.
 */
export function AboutScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const api = useApiVersion();
  const navigation = useNavigation();
  const staff = !!useMe().data?.platformRole;
  const recording = useNetworkLog((s) => s.recording);
  const build = appInfo.expoGo ? t('about.expoGo') : appInfo.build;
  const pushToken = usePushToken((s) => s.token);
  const pending = useErrorReports((s) => s.reports.filter((r) => r.status === 'pending' || r.status === 'new').length);
  const copyToken = async () => {
    await Clipboard.setStringAsync(pushToken!);
    useToast.getState().show({ message: t('about.pushTokenCopied') });
  };

  return (
    <Screen scroll edges={['bottom']}>
      <View style={{ paddingBottom: space.sm }}>
        <Text variant="title" accessibilityRole="header">{t('about.title')}</Text>
      </View>
      <SectionLabel>{t('about.app')}</SectionLabel>
      <ListRow label={t('about.version')} value={build ? `${appInfo.version} (${build})` : appInfo.version} divider={!!pushToken} />
      {/* Test builds: for Expo's push tool (docs/push-setup.md, Checking it works). */}
      {pushToken && <ListRow label={t('about.pushToken')} value={t('about.copy')} onPress={copyToken} chevron={false} divider={false} />}

      <SectionLabel>{t('about.api')}</SectionLabel>
      <ListRow label={t('about.version')} value={api.data?.version ?? (api.isError ? t('about.unreachable') : '…')} />
      <ListRow label={t('about.server')} value={systemApi.host()} divider={false} />

      {/* Everyone while testing (M89); support and admin only before the store release (pending-decisions.md). */}
      <SectionLabel>{t('about.problems')}</SectionLabel>
      <ListRow
        label={t('errorReports.title')}
        value={pending ? <Text variant="body" color="danger">{t('errorReports.pendingCount', { count: pending })}</Text> : undefined}
        onPress={() => navigation.navigate('ErrorReports')}
        divider={false}
      />

      {/* For support and admin: the app's API calls, to see what a screen asked and what came back. */}
      {staff && (
        <>
          <SectionLabel>{t('about.support')}</SectionLabel>
          <ListRow
            label={t('networkLog.title')}
            value={recording ? <Text variant="body" color="danger">{`● ${t('networkLog.recordingOn')}`}</Text> : undefined}
            onPress={() => navigation.navigate('NetworkLog')}
            divider={false}
          />
        </>
      )}
    </Screen>
  );
}
