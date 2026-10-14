import { Feather } from '@expo/vector-icons';
import { StackActions, useNavigation, type StaticScreenProps } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import { useMe } from '@/data/tenancy/queries';
import { useNetworkLog } from '@/shared/network/networkLog';
import { ListRow, Pill, radius, Screen, SectionLabel, Text, useTheme, useToast } from '@/shared/ui';

import { useSessionInfo } from './useSessionInfo';
import { curlOf, entryText, headersText } from './shareText';
import { sizeLabel, statusLabel } from './statusTone';

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });
const STARTED: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' };

/**
 * One call in the Network log (M53): status, time, duration, size, whether a token went, its trace id (tap to copy),
 * the URL, and the request and response headers and bodies (selectable). Share sends all of it with the session;
 * Copy as curl, to repeat it in Postman.
 */
export function NetworkLogEntryScreen({ route }: StaticScreenProps<{ id: number }>) {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const timeZone = useMe().data?.timeZone ?? 'UTC';
  const session = useSessionInfo();
  const allowed = useNetworkLog((s) => s.allowed);
  const entry = useNetworkLog((s) => s.entries.find((e) => e.id === route.params.id));

  // A role removed while it is open: back to About.
  useEffect(() => {
    if (!allowed) navigation.dispatch(StackActions.popTo('About'));
  }, [allowed, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: entry
        ? () => (
            <Pressable onPress={() => void Share.share({ message: entryText(entry, session) })} accessibilityRole="button" accessibilityLabel={t('networkLog.share')} style={styles.headerButton}>
              <Feather name="share" size={20} color={colors.accent} />
            </Pressable>
          )
        : undefined,
    });
  });

  if (!entry) return <Screen edges={['bottom']}><Text variant="subhead" color="ink3">{t('networkLog.gone')}</Text></Screen>;

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    useToast.getState().show({ message: t('networkLog.copied') });
  };

  const block = (text: string) => (
    <View style={[styles.block, { backgroundColor: colors.surface2, padding: space.md }]}>
      <Text selectable variant="footnote" style={{ fontFamily: mono }}>{text}</Text>
    </View>
  );
  const section = (label: string, text?: string) =>
    text ? (
      <>
        <SectionLabel>{label}</SectionLabel>
        {block(text)}
      </>
    ) : null;

  const failed = !!entry.errorCode;
  return (
    <Screen scroll edges={['bottom']} contentStyle={{ paddingBottom: space.huge }}>
      <Text variant="headline" selectable style={{ marginBottom: space.sm }}>{`${entry.method} ${entry.path}`}</Text>
      <ListRow label={t('networkLog.status')} value={statusLabel(entry)} />
      <ListRow label={t('networkLog.started')} value={formatInstant(entry.startedAt, i18n.language, timeZone, STARTED)} />
      <ListRow label={t('networkLog.duration')} value={entry.ms === undefined ? '…' : `${entry.ms} ms`} />
      {entry.size !== undefined && <ListRow label={t('networkLog.size')} value={sizeLabel(entry.size)} />}
      <ListRow label={t('networkLog.token')} value={t(entry.tokenSent ? 'networkLog.tokenSent' : 'networkLog.tokenNotSent')} />
      {!!entry.notes.length && <ListRow label={t('networkLog.notes')} value={entry.notes.join(', ')} />}
      {entry.traceId ? (
        <ListRow label={t('networkLog.traceId')} value={entry.traceId} onPress={() => void copy(entry.traceId!)} chevron={false} divider={false} />
      ) : (
        // A failure with no trace id wasn't written by the API (a proxy, or a crash before its error handler).
        failed && entry.status !== undefined && <ListRow label={t('networkLog.traceId')} value={t('networkLog.noTraceId')} divider={false} />
      )}

      <View style={[styles.actions, { gap: space.sm, paddingVertical: space.md }]}>
        <Pill label={t('networkLog.copyCurl')} tone="quiet" onPress={() => void copy(curlOf(entry))} />
      </View>

      {section(t('networkLog.url'), entry.url)}
      {section(t('networkLog.requestHeaders'), headersText(entry.requestHeaders))}
      {section(t('networkLog.request'), entry.requestBody)}
      {section(t('networkLog.responseHeaders'), headersText(entry.responseHeaders))}
      {section(t('networkLog.response'), entry.responseBody)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  actions: { flexDirection: 'row' },
  block: { borderRadius: radius.md },
});
