import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TEAM_ROLES, type RoleCell } from '@/core/sharing/teamRoles';
import { Screen, Text, useTheme } from '@/shared/ui';

const ROLES = ['owner', 'member', 'guest'] as const;

/** People's ⓘ (M152): what Owners, Members and guests may do in a team, as a table. */
export function TeamRolesScreen() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('teamRoles.title'),
      headerRight: () => (
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" hitSlop={8} style={styles.done}>
          <Text variant="button" color="accent">{t('common.done')}</Text>
        </Pressable>
      ),
    });
  }, [navigation, t]);

  const cell = (c: RoleCell) =>
    c === 'yes' ? <Feather name="check" size={16} color={colors.accent} accessibilityLabel="✓" />
      : c === 'no' ? <Feather name="minus" size={16} color={colors.ink3} accessibilityLabel="—" />
        : <Text variant="caption" color="ink2">{t('teamRoles.oneList')}</Text>;

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.huge }}>
        <View style={[styles.row, { borderBottomColor: colors.line, paddingVertical: space.sm }]}>
          <View style={styles.what} />
          {ROLES.map((r) => <Text key={r} variant="label" color="ink2" style={styles.role}>{t(`browse.role.${r}`)}</Text>)}
        </View>
        {TEAM_ROLES.map((row) => (
          <View key={row.key} style={[styles.row, { borderBottomColor: colors.line, paddingVertical: space.md }]}>
            <Text variant="subhead" style={styles.what}>{t(`teamRoles.rows.${row.key}`)}</Text>
            {ROLES.map((r) => <View key={r} style={styles.role}>{cell(row[r])}</View>)}
          </View>
        ))}
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          {ROLES.map((r) => (
            <Text key={r} variant="subhead" color="ink2">
              <Text variant="subhead" style={styles.bold}>{t(`browse.role.${r}`)}:</Text> {t(`teamRoles.about.${r}`)}
            </Text>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  what: { flex: 1, paddingRight: 8 },
  role: { width: 64, alignItems: 'center', textAlign: 'center' },
  bold: { fontWeight: '600' },
  done: { minHeight: 44, justifyContent: 'center' },
});
