import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { isConnectionError } from '@/core/http/problem';
import { errorMessage } from '@/shared/i18n/errors';
import { Notice, Text, TextButton, useTheme } from '@/shared/ui';

/**
 * A screen whose first load failed, in place of its content. Couldn't reach Azignia: the Can't connect page (M90), the
 * icon, the message and Try again. Any other error: its message in a Notice with Try again.
 */
export function LoadError({ error, onRetry }: { error: unknown; onRetry(): void }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();

  if (!isConnectionError(error)) {
    return (
      <View style={{ gap: space.sm, marginTop: space.md, alignItems: 'flex-start' }}>
        <Notice>{errorMessage(error)}</Notice>
        <TextButton label={t('common.retry')} onPress={onRetry} />
      </View>
    );
  }
  return (
    <View style={[styles.page, { gap: space.sm, paddingHorizontal: space.xl, paddingVertical: space.huge }]} accessibilityRole="alert">
      <View style={[styles.icon, { backgroundColor: colors.surface2, marginBottom: space.xs }]}>
        <Feather name="cloud-off" size={28} color={colors.ink2} />
      </View>
      <Text variant="headline" align="center">{t('connection.cantConnect')}</Text>
      <Text variant="body" color="ink2" align="center">{t('connection.check')}</Text>
      <View style={{ marginTop: space.sm }}>
        <TextButton label={t('common.retry')} onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
