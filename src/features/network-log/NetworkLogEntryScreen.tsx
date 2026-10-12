import type { StaticScreenProps } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { useNetworkLog } from '@/shared/network/networkLog';
import { ListRow, radius, Screen, SectionLabel, Text, useTheme } from '@/shared/ui';

import { statusLabel } from './statusTone';

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

/** One call in the Network log: when, how long, status, notes, and the request and response bodies as JSON (selectable). */
export function NetworkLogEntryScreen({ route }: StaticScreenProps<{ id: number }>) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const entry = useNetworkLog((s) => s.entries.find((e) => e.id === route.params.id));
  if (!entry) return <Screen edges={['bottom']}><Text variant="subhead" color="ink3">{t('networkLog.gone')}</Text></Screen>;

  const block = (value: unknown) => (
    <View style={[styles.block, { backgroundColor: colors.surface2, padding: space.md }]}>
      <Text selectable variant="footnote" style={{ fontFamily: mono }}>{pretty(value)}</Text>
    </View>
  );

  return (
    <Screen scroll edges={['bottom']}>
      <Text variant="headline" selectable style={{ marginBottom: space.sm }}>{`${entry.method} ${entry.path}`}</Text>
      <ListRow label={t('networkLog.status')} value={statusLabel(entry)} />
      <ListRow label={t('networkLog.started')} value={entry.startedAt} />
      <ListRow label={t('networkLog.duration')} value={entry.ms === undefined ? '…' : `${entry.ms} ms`} divider={!!entry.notes.length} />
      {!!entry.notes.length && <ListRow label={t('networkLog.notes')} value={entry.notes.join(', ')} divider={false} />}

      {entry.requestBody !== undefined && (
        <>
          <SectionLabel>{t('networkLog.request')}</SectionLabel>
          {block(entry.requestBody)}
        </>
      )}
      {entry.error ? (
        <>
          <SectionLabel>{t('networkLog.error')}</SectionLabel>
          {block(entry.error)}
        </>
      ) : entry.responseBody !== undefined ? (
        <>
          <SectionLabel>{t('networkLog.response')}</SectionLabel>
          {block(entry.responseBody)}
        </>
      ) : null}
      <View style={{ height: space.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: radius.md },
});
