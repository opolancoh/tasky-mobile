import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import { useMe } from '@/data/tenancy/queries';
import { sendPending, useErrorReports, type ErrorReport } from '@/shared/errors/errorReports';
import { chooseAction, confirm, Screen, Text, TextButton, useTheme } from '@/shared/ui';

import { statusColor } from './statusTone';

/** Throws while drawing: Test an error's render error, caught by the app's error boundary. */
function Boom(): null {
  throw new Error('Test error from Me › About › Error reports');
}

const WHEN: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };

/**
 * Me › About › Error reports (M89): the JavaScript errors kept on this phone, newest first, each Sent, Pending or
 * Sending…. Send all sends what's pending; Clear all asks first; Test an error makes one. Shown to everyone while testing.
 */
export function ErrorReportsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const timeZone = useMe().data?.timeZone ?? 'UTC';
  const reports = useErrorReports((s) => s.reports);
  const clear = useErrorReports((s) => s.clear);
  const pending = reports.filter((r) => r.status === 'pending' || r.status === 'new').length;
  const sending = reports.some((r) => r.status === 'sending');
  const [boom, setBoom] = useState(false);

  // To check the whole path while testing: Something went wrong, the report saved, sent and in logs.client_error.
  const testError = async () => {
    const i = await chooseAction({
      title: t('errorReports.test.title'),
      actions: [{ label: t('errorReports.test.render'), icon: 'alert-circle' }, { label: t('errorReports.test.promise'), icon: 'zap' }],
      cancelLabel: t('common.cancel'),
    });
    if (i === 0) setBoom(true);
    if (i === 1) void Promise.reject(new Error('Test unhandled promise from Me › About › Error reports'));
  };

  const askClear = async () => {
    const ok = await confirm({ title: t('errorReports.clearTitle'), message: t('errorReports.clearBody'), confirmLabel: t('errorReports.clear'), cancelLabel: t('common.cancel') });
    if (ok) clear();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: reports.length
        ? () => (
            <Pressable onPress={() => void askClear()} accessibilityRole="button" accessibilityLabel={t('errorReports.clear')} style={styles.headerButton}>
              <Feather name="trash-2" size={20} color={colors.accent} />
            </Pressable>
          )
        : undefined,
    });
  });

  const renderItem = ({ item }: { item: ErrorReport }) => (
    <Pressable
      onPress={() => navigation.navigate('ErrorReport', { id: item.id })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { gap: space.md, paddingVertical: space.sm, borderBottomColor: colors.line, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}
    >
      <View style={styles.fill}>
        <Text variant="subhead" numberOfLines={1}>{item.message}</Text>
        <Text variant="footnote" color="ink3" numberOfLines={1}>
          {[item.screen, formatInstant(item.occurredAt, i18n.language, timeZone, WHEN)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text variant="footnote" color={statusColor(item.status)}>{t(`errorReports.status.${item.status}`)}</Text>
    </Pressable>
  );

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <View style={[styles.head, { paddingBottom: space.sm }]}>
        <Text variant="title" accessibilityRole="header" style={styles.fill}>{t('errorReports.title')}</Text>
        {pending > 0 && <TextButton label={t('errorReports.sendAll', { count: pending })} onPress={() => void sendPending()} busy={sending} />}
      </View>
      <Text variant="footnote" color="ink3" style={{ paddingBottom: space.sm }}>{t('errorReports.hint')}</Text>
      <FlashList
        data={reports}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text variant="subhead" color="ink3" style={{ paddingVertical: space.xl }}>{t('errorReports.empty')}</Text>}
        ListFooterComponent={<View style={[styles.test, { paddingVertical: space.lg }]}><TextButton label={t('errorReports.test.button')} tone="quiet" onPress={() => void testError()} /></View>}
      />
      {boom && <Boom />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center' },
  test: { alignItems: 'flex-start' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
});
