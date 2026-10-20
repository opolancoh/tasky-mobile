import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import { useMe } from '@/data/tenancy/queries';
import { sendReports, useErrorReports } from '@/shared/errors/errorReports';
import { crumbLine, reportSectionText, reportText } from '@/shared/errors/reportText';
import { confirm, ListRow, Pill, radius, Screen, SectionLabel, Text, useTheme, useToast } from '@/shared/ui';

import { statusColor } from './statusTone';

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });
const WHEN: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' };

/** One error report (M89): what happened, where, on which app and phone, its stacks and the steps before it; Share sends it all, each section's icon only that section (M91). */
export function ErrorReportScreen({ route }: StaticScreenProps<{ id: string }>) {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const timeZone = useMe().data?.timeZone ?? 'UTC';
  const report = useErrorReports((s) => s.reports.find((r) => r.id === route.params.id));
  const remove = useErrorReports((s) => s.remove);

  if (!report) return <Screen edges={['bottom']}><Text variant="subhead" color="ink3">{t('errorReports.gone')}</Text></Screen>;

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    useToast.getState().show({ message: t('errorReports.copied') });
  };
  const askDelete = async () => {
    const ok = await confirm({ title: t('errorReports.deleteTitle'), message: t('errorReports.deleteBody'), confirmLabel: t('errorReports.delete'), cancelLabel: t('common.cancel') });
    if (!ok) return;
    navigation.goBack();
    remove(report.id);
  };
  // `name`: the section in the shared text, in English like the rest of it (M91).
  const block = (label: string, name: string, text?: string) =>
    text ? (
      <>
        <SectionLabel action={{ icon: 'share', label: t('errorReports.shareSection', { name: label }), onPress: () => void Share.share({ message: reportSectionText(report, name, text) }) }}>{label}</SectionLabel>
        <View style={[styles.block, { backgroundColor: colors.surface2, padding: space.md }]}>
          <Text selectable variant="footnote" style={{ fontFamily: mono }}>{text}</Text>
        </View>
      </>
    ) : null;
  const unsent = report.status === 'pending' || report.status === 'new';

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ paddingBottom: space.huge }}>
      <Text variant="headline" selectable style={{ marginBottom: space.sm }}>{report.code ? `${report.code}: ${report.message}` : report.message}</Text>
      <ListRow label={t('errorReports.statusLabel')} value={<Text variant="body" color={statusColor(report.status)}>{t(`errorReports.status.${report.status}`)}</Text>} />
      <ListRow label={t('errorReports.when')} value={formatInstant(report.occurredAt, i18n.language, timeZone, WHEN)} />
      <ListRow label={t('errorReports.screen')} value={report.screen ?? '—'} />
      <ListRow label={t('errorReports.caughtBy')} value={t(`errorReports.source.${report.source}`) + (report.fatal ? ` · ${t('errorReports.fatal')}` : '')} />
      <ListRow label={t('errorReports.app')} value={`${report.appVersion} · ${report.environment}`} />
      <ListRow label={t('errorReports.device')} value={report.deviceInfo} divider={!!report.requestTraceId} />
      {report.requestTraceId && <ListRow label={t('errorReports.traceId')} value={report.requestTraceId} onPress={() => void copy(report.requestTraceId!)} chevron={false} divider={false} />}

      <View style={[styles.actions, { gap: space.sm, paddingVertical: space.md }]}>
        {(unsent || report.status === 'sending') && <Pill label={t('errorReports.send')} tone="accent" busy={report.status === 'sending'} onPress={() => void sendReports([report.id])} />}
        <Pill label={t('errorReports.share')} tone="quiet" onPress={() => void Share.share({ message: reportText(report) })} />
        <Pill label={t('errorReports.copy')} tone="quiet" onPress={() => void copy(reportText(report))} />
        <Pill label={t('errorReports.delete')} tone="quiet" onPress={() => void askDelete()} />
      </View>

      {block(t('errorReports.stack'), 'Stack', report.stack)}
      {block(t('errorReports.componentStack'), 'Component stack', report.componentStack)}
      {block(t('errorReports.before'), 'Before it', report.breadcrumbs.map(crumbLine).join('\n'))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  block: { borderRadius: radius.md },
});
