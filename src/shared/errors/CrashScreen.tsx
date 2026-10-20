import { Feather } from '@expo/vector-icons';
import { reloadAppAsync } from 'expo';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, radius, Text, TextButton, useTheme } from '@/shared/ui';

import { useErrorReports } from './errorReports';
import { reportText } from './reportText';

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

/**
 * Something went wrong (M89): in place of the whole app after a fatal JavaScript error, instead of closing.
 * Restart reloads the JavaScript; View report shows the saved report here (navigation may be what broke), with Share.
 */
export function CrashScreen() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const report = useErrorReports((s) => s.reports.find((r) => r.id === s.crashed));
  const [open, setOpen] = useState(false);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: space.xxl, gap: space.md }]}>
        <View style={[styles.icon, { backgroundColor: colors.surface2, marginBottom: space.sm }]}>
          <Feather name="alert-circle" size={30} color={colors.ink2} />
        </View>
        <Text variant="title" align="center" accessibilityRole="header">{t('crash.title')}</Text>
        <Text variant="body" color="ink2" align="center">{t('crash.body')}</Text>
        <View style={[styles.actions, { gap: space.sm, marginTop: space.lg }]}>
          <Button title={t('crash.restart')} onPress={() => void reloadAppAsync()} />
          {report && <TextButton label={t(open ? 'crash.hideReport' : 'crash.viewReport')} onPress={() => setOpen(!open)} />}
        </View>
        {open && report && (
          <View style={[styles.report, { gap: space.sm, marginTop: space.md }]}>
            <View style={[styles.block, { backgroundColor: colors.surface2, padding: space.md }]}>
              <Text selectable variant="footnote" style={{ fontFamily: mono }}>{reportText(report)}</Text>
            </View>
            <TextButton label={t('errorReports.share')} onPress={() => void Share.share({ message: reportText(report) })} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch', alignItems: 'center' },
  report: { alignSelf: 'stretch', alignItems: 'center' },
  block: { alignSelf: 'stretch', borderRadius: radius.md },
});
