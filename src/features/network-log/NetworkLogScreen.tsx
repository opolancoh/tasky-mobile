import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useNetworkLog, type NetworkEntry } from '@/shared/network/networkLog';
import { radius, Screen, Text, useTheme } from '@/shared/ui';

import { statusLabel, statusTone } from './statusTone';

/**
 * Me › About › Network log (support and admin): record the app's API calls and look at each one, to see what a
 * screen asked and what came back. In memory only, the last 100; secrets as "***".
 */
export function NetworkLogScreen() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const recording = useNetworkLog((s) => s.recording);
  const entries = useNetworkLog((s) => s.entries);
  const setRecording = useNetworkLog((s) => s.setRecording);
  const clear = useNetworkLog((s) => s.clear);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: entries.length
        ? () => (
            <Pressable onPress={clear} hitSlop={8} accessibilityRole="button" style={styles.headerButton}>
              <Text variant="button" color="accent">{t('networkLog.clear')}</Text>
            </Pressable>
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
        style={({ pressed }) => [styles.row, { gap: space.md, borderBottomColor: colors.line, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}
      >
        <View style={[styles.status, { backgroundColor: tone === 'ink3' ? colors.surface2 : colors[`${tone}Soft`] }]}>
          <Text variant="caption" color={tone === 'warn' ? 'ink' : tone}>{statusLabel(item)}</Text>
        </View>
        <View style={styles.fill}>
          <Text variant="subhead" numberOfLines={1}>{`${item.method} ${item.path}`}</Text>
          <Text variant="footnote" color="ink3">
            {`${item.startedAt.slice(11, 19)}${item.ms === undefined ? '' : ` · ${item.ms} ms`}${item.notes.length ? ` · ${item.notes.join(', ')}` : ''}`}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <View style={[styles.record, { gap: space.md, paddingVertical: space.md, borderBottomColor: colors.line }]}>
        <View style={styles.fill}>
          <Text variant="body">{t('networkLog.record')}</Text>
          <Text variant="footnote" color="ink3">{t('networkLog.recordHint')}</Text>
        </View>
        <Switch value={recording} onValueChange={setRecording} trackColor={{ true: colors.accent }} accessibilityLabel={t('networkLog.record')} />
      </View>
      <FlashList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text variant="subhead" color="ink3" style={{ paddingVertical: space.xl }}>{t(recording ? 'networkLog.emptyRecording' : 'networkLog.empty')}</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerButton: { minHeight: 44, justifyContent: 'center' },
  record: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  status: { minWidth: 52, paddingHorizontal: 6, paddingVertical: 4, borderRadius: radius.sm, alignItems: 'center' },
});
