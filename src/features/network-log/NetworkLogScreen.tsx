import { Feather } from '@expo/vector-icons';
import { StackActions, useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, StyleSheet, Switch, View } from 'react-native';

import { formatInstant } from '@/core/dates/localDate';
import { useMe } from '@/data/tenancy/queries';
import { useNetworkLog, type NetworkEntry } from '@/shared/network/networkLog';
import { confirm, Pill, radius, Screen, Text, useTheme } from '@/shared/ui';

import { useSessionInfo } from './useSessionInfo';
import { logText, timingLine } from './shareText';
import { SLOW_MS, statusLabel, statusTone } from './statusTone';

type Filter = 'all' | 'errors' | 'slow';
const FILTERS: Filter[] = ['all', 'errors', 'slow'];
const matches = (filter: Filter, e: NetworkEntry) => filter === 'all' || (filter === 'errors' ? !!e.errorCode : (e.ms ?? 0) >= SLOW_MS);
const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' };

/**
 * Me › About › Network log (support and admin, M53): record the app's API calls and look at each one, to see what a
 * screen asked and what came back. All, Errors or Slow; Share sends the shown calls (failed ones in full); Clear asks
 * first. In memory only, the last 100; secrets as "***". Leaves when the role goes.
 */
export function NetworkLogScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const timeZone = useMe().data?.timeZone ?? 'UTC';
  const session = useSessionInfo();
  const allowed = useNetworkLog((s) => s.allowed);
  const recording = useNetworkLog((s) => s.recording);
  const entries = useNetworkLog((s) => s.entries);
  const setRecording = useNetworkLog((s) => s.setRecording);
  const clear = useNetworkLog((s) => s.clear);
  const [filter, setFilter] = useState<Filter>('all');
  const shown = filter === 'all' ? entries : entries.filter((e) => matches(filter, e));

  // A role removed while it is open: back to About.
  useEffect(() => {
    if (!allowed) navigation.dispatch(StackActions.popTo('About'));
  }, [allowed, navigation]);

  const askClear = async () => {
    const ok = await confirm({ title: t('networkLog.clearTitle'), message: t('networkLog.clearBody'), confirmLabel: t('networkLog.clear'), cancelLabel: t('common.cancel') });
    if (ok) clear();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: entries.length
        ? () => (
            <View style={styles.headerButtons}>
              <Pressable onPress={() => void Share.share({ message: logText(shown, session) })} accessibilityRole="button" accessibilityLabel={t('networkLog.share')} style={styles.headerButton}>
                <Feather name="share" size={20} color={colors.accent} />
              </Pressable>
              <Pressable onPress={() => void askClear()} accessibilityRole="button" accessibilityLabel={t('networkLog.clear')} style={styles.headerButton}>
                <Feather name="trash-2" size={20} color={colors.accent} />
              </Pressable>
            </View>
          )
        : undefined,
    });
  });

  const renderItem = ({ item }: { item: NetworkEntry }) => {
    const tone = statusTone(item);
    return (
      <Pressable
        onPress={() => navigation.navigate('NetworkLogEntry', { id: item.id })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, { gap: space.md, paddingVertical: space.sm, borderBottomColor: colors.line, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}
      >
        <View style={[styles.status, { paddingHorizontal: space.xs + 2, paddingVertical: space.xs, backgroundColor: tone === 'ink3' ? colors.surface2 : colors[`${tone}Soft`] }]}>
          <Text variant="caption" color={tone === 'warn' ? 'ink' : tone}>{statusLabel(item)}</Text>
        </View>
        <View style={styles.fill}>
          <Text variant="subhead" numberOfLines={1}>{`${item.method} ${item.path}`}</Text>
          <Text variant="footnote" color="ink3" numberOfLines={1}>
            {[formatInstant(item.startedAt, i18n.language, timeZone, TIME), timingLine(item)].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <View style={{ paddingBottom: space.sm }}>
        <Text variant="title" accessibilityRole="header">{t('networkLog.title')}</Text>
      </View>
      <View style={[styles.record, { gap: space.md, paddingVertical: space.md, borderBottomColor: colors.line }]}>
        <View style={styles.fill}>
          <Text variant="body">{t('networkLog.record')}</Text>
          <Text variant="footnote" color="ink3">{t('networkLog.recordHint')}</Text>
        </View>
        <Switch value={recording} onValueChange={setRecording} trackColor={{ true: colors.accent }} accessibilityLabel={t('networkLog.record')} />
      </View>
      <View style={[styles.filters, { gap: space.sm, paddingVertical: space.md }]}>
        {FILTERS.map((f) => (
          <Pill key={f} label={t(`networkLog.filter.${f}`)} tone={f === filter ? 'accent' : 'quiet'} onPress={() => setFilter(f)} />
        ))}
      </View>
      <FlashList
        data={shown}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <Text variant="subhead" color="ink3" style={{ paddingVertical: space.xl }}>
            {t(entries.length ? 'networkLog.emptyFilter' : recording ? 'networkLog.emptyRecording' : 'networkLog.empty')}
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
  filters: { flexDirection: 'row' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  status: { minWidth: 52, borderRadius: radius.sm, alignItems: 'center' },
});
