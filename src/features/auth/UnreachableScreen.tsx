import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useSession } from '@/shared/session/SessionProvider';
import { Button, Logo, Screen, Text, useTheme } from '@/shared/ui';

/**
 * Shown at launch when there is a stored session but the API can't be reached (M12). The session is
 * kept: Try again (or coming back to the app) checks it again; Sign out is the way to another account.
 */
export function UnreachableScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const { retry, signOut } = useSession();
  const retrying = useMutation({ mutationFn: retry });

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: space.md }}>
        <View style={{ marginBottom: space.xl }}>
          <Logo />
        </View>
        <Text variant="title">{t('session.unreachable.title')}</Text>
        <Text variant="callout" color="ink2">
          {t('session.unreachable.body')}
        </Text>
      </View>
      <View style={{ gap: space.sm, paddingBottom: space.lg }}>
        <Button title={t('common.retry')} onPress={() => retrying.mutate()} loading={retrying.isPending} />
        <View style={{ alignItems: 'center' }}>
          <Button variant="link" title={t('common.signOut')} onPress={signOut} />
        </View>
      </View>
    </Screen>
  );
}
