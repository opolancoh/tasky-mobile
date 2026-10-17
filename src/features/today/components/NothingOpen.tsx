import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useShowBrowseSheet } from '@/shared/browseSheet/browseSheetStore';
import { useQuickAdd } from '@/shared/quickAdd/quickAddStore';
import { radius, Text, useTheme } from '@/shared/ui';

type Action = 'task' | 'reminder' | 'date' | 'list' | 'share';
const ACTIONS: { key: Action; icon: ComponentProps<typeof Feather>['name'] }[] = [
  { key: 'task', icon: 'plus' },
  { key: 'reminder', icon: 'bell' },
  { key: 'date', icon: 'calendar' },
  { key: 'list', icon: 'list' },
  { key: 'share', icon: 'users' },
];

/**
 * Home with no open task and nothing to answer (M67): a list's empty state, "Nothing open here" (or "All done" when
 * only completed tasks are left; `done` is unknown while that's asked), then five ways to start as rows: Quick add (on
 * its Reminder or Due date picker for those two), New list (then the list), Browse for sharing.
 */
export function NothingOpen({ done }: { done: boolean | undefined }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const showQuickAdd = useQuickAdd((s) => s.show);
  const showSheet = useShowBrowseSheet();
  const go: Record<Action, () => void> = {
    task: () => showQuickAdd(),
    reminder: () => showQuickAdd('', 'reminder'),
    date: () => showQuickAdd('', 'due'),
    list: () => showSheet({ kind: 'list' }),
    share: () => navigation.navigate('Tabs', { screen: 'Browse' }),
  };

  return (
    <View>
      <View style={[styles.empty, { gap: space.xs, paddingTop: space.xxl, paddingBottom: space.md }]}>
        <Feather name="check-circle" size={28} color={colors.accent} />
        {done !== undefined && <Text variant="bodyMedium">{t(done ? 'home.start.allDone' : 'home.start.nothingOpen')}</Text>}
        <Text variant="footnote" color="ink3">{t('home.start.line')}</Text>
      </View>
      {ACTIONS.map(({ key, icon }) => (
        <Pressable key={key} onPress={go[key]} accessibilityRole="button">
          {({ pressed }) => (
            <View style={[styles.row, { gap: space.md, borderBottomColor: colors.line, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
              <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                <Feather name={icon} size={17} color={colors.accent} />
              </View>
              <View style={styles.fill}>
                <Text variant="bodyMedium">{t(`home.start.${key}`)}</Text>
                <Text variant="footnote" color="ink3">{t(`home.start.${key}Sub`)}</Text>
              </View>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 32, height: 32, borderRadius: radius.sm + 1, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
});
