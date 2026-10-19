import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Sheet, Text, TextButton, useTheme } from '@/shared/ui';

import { allowNotifications, useNotificationAsk } from './permission';

/**
 * Our line before the phone's notification dialog (D97, the hub's Push notifications, A): shown the first time it
 * matters. Turn on opens the phone's dialog; Not now waits for the next time it matters. Mounted once in App.
 */
export function NotificationAskSheet() {
  const { t } = useTranslation();
  const { colors, radius, space } = useTheme();
  const visible = useNotificationAsk((s) => s.visible);
  const notNow = () => useNotificationAsk.getState().hide(true);

  return (
    <Sheet visible={visible} onDismiss={notNow} dismissLabel={t('common.close')} size="fit">
      <View style={[styles.body, { gap: space.sm, paddingTop: space.md, paddingBottom: space.lg }]}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
          <Feather name="bell" size={26} color={colors.accent} />
        </View>
        <Text variant="title" style={styles.center} accessibilityRole="header">{t('push.askTitle')}</Text>
        <Text variant="subhead" color="ink2" style={styles.center}>{t('push.askBody')}</Text>
        <View style={[styles.actions, { gap: space.xs, marginTop: space.md }]}>
          <Button title={t('push.turnOn')} onPress={() => void allowNotifications()} />
          <TextButton label={t('push.notNow')} tone="quiet" onPress={notNow} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center' },
  icon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', alignItems: 'center' },
});
