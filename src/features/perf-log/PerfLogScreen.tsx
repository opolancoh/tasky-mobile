import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Share, StyleSheet, Switch, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import { useMe } from '@/data/tenancy/queries';
import { appInfo } from '@/shared/appInfo';
import { isBusy, sampleLine, usePerfLog, type PerfSample } from '@/shared/perf/perfLog';
import { confirm, Screen, Text, useTheme } from '@/shared/ui';

const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' };

/**
 * Me › About › Perf log (support and admin), temporary: one line every 10 s while recording, newest first, a busy one
 * in red. Share sends them as text. Remove it once the heat is found.
 */
export function PerfLogScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const timeZone = useMe().data?.timeZone ?? 'UTC';
  const recording = usePerfLog((s) => s.recording);
  const samples = usePerfLog((s) => s.samples);
  const setRecording = usePerfLog((s) => s.setRecording);
  const clear = usePerfLog((s) => s.clear);
  const time = (s: PerfSample) => formatInstant(s.at, i18n.language, timeZone, TIME);

  const share = () => {
    const head = `Azignia ${appInfo.version}${appInfo.build ? ` (${appInfo.build})` : ''} · ${Platform.OS} ${Platform.Version}`;
    const lines = samples.map((s) => `${s.at} ${s.state} ${s.screen ?? '-'} · ${sampleLine(s)}`);
    void Share.share({ message: [head, '', ...lines].join('\n') });
  };
  const askClear = async () => {
    const ok = await confirm({ title: t('perfLog.clearTitle'), message: t('perfLog.clearBody'), confirmLabel: t('perfLog.clear'), cancelLabel: t('common.cancel') });
    if (ok) clear();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: samples.length
        ? () => (
            <View style={styles.headerButtons}>
              <Pressable onPress={share} accessibilityRole="button" accessibilityLabel={t('perfLog.share')} style={styles.headerButton}>
                <Feather name="share" size={20} color={colors.accent} />
              </Pressable>
              <Pressable onPress={() => void askClear()} accessibilityRole="button" accessibilityLabel={t('perfLog.clear')} style={styles.headerButton}>
                <Feather name="trash-2" size={20} color={colors.accent} />
              </Pressable>
            </View>
          )
        : undefined,
    });
  });

  const renderItem = ({ item }: { item: PerfSample }) => (
    <View style={[styles.row, { paddingVertical: space.sm, borderBottomColor: colors.line }]}>
      <Text variant="subhead" numberOfLines={1}>{`${time(item)} · ${item.screen ?? '—'} · ${item.state}`}</Text>
      <Text variant="footnote" color={isBusy(item) ? 'danger' : 'ink3'}>{sampleLine(item)}</Text>
    </View>
  );

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <View style={{ paddingBottom: space.sm }}>
        <Text variant="title" accessibilityRole="header">{t('perfLog.title')}</Text>
      </View>
      <View style={[styles.record, { gap: space.md, paddingVertical: space.md, borderBottomColor: colors.line }]}>
        <View style={styles.fill}>
          <Text variant="body">{t('perfLog.record')}</Text>
          <Text variant="footnote" color="ink3">{t('perfLog.recordHint')}</Text>
        </View>
        <Switch value={recording} onValueChange={setRecording} trackColor={{ true: colors.accent }} accessibilityLabel={t('perfLog.record')} />
      </View>
      <FlashList
        data={samples}
        renderItem={renderItem}
        keyExtractor={(item) => item.at}
        ListEmptyComponent={
          <Text variant="subhead" color="ink3" style={{ paddingVertical: space.xl }}>
            {t(recording ? 'perfLog.emptyRecording' : 'perfLog.empty')}
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerButtons: { flexDirection: 'row', marginRight: -10 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  record: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  row: { gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
});
