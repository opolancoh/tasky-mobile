import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useQuickAdd } from '@/shared/quickAdd/quickAddStore';
import { Sheet, Text, useTheme } from '@/shared/ui';

interface AddMenuProps {
  /** New list and New team are Spaces' sheets; App opens them, since it can go to what was created. */
  onNewList(): void;
  onNewTeam(): void;
}

/** The +'s menu (M113): Task opens Quick add, List and Team Spaces' sheets; Reminder joins once it is its own kind. */
export function AddMenu({ onNewList, onNewTeam }: AddMenuProps) {
  const { t } = useTranslation();
  const { colors, radius, space } = useTheme();
  const open = useQuickAdd((s) => s.menu);
  const hideMenu = useQuickAdd((s) => s.hideMenu);
  const show = useQuickAdd((s) => s.show);

  const rows: { key: string; icon: ComponentProps<typeof Feather>['name']; run(): void }[] = [
    { key: 'task', icon: 'check-circle', run: () => show() },
    { key: 'list', icon: 'list', run: onNewList },
    { key: 'team', icon: 'users', run: onNewTeam },
  ];

  return (
    <Sheet visible={open} onDismiss={hideMenu} dismissLabel={t('common.close')} size="fit">
      <View style={{ paddingBottom: space.sm }}>
        <Text variant="footnote" color="ink3" accessibilityRole="header" style={[styles.title, { marginBottom: space.xs }]}>{t('quickAdd.menu.title')}</Text>
        {rows.map(({ key, icon, run }, i) => (
          <Pressable
            key={key}
            onPress={() => {
              hideMenu();
              run();
            }}
            accessibilityRole="button"
            accessibilityHint={t(`quickAdd.menu.${key}Body`)}
            style={({ pressed }) => [
              styles.row,
              { gap: space.md, paddingHorizontal: space.xs, borderTopColor: colors.line, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, backgroundColor: pressed ? colors.surface2 : 'transparent' },
            ]}
          >
            <View style={[styles.tile, { borderRadius: radius.sm, backgroundColor: colors.accentSoft }]}>
              <Feather name={icon} size={18} color={colors.accent} />
            </View>
            <View style={styles.text}>
              <Text variant="bodyMedium">{t(`quickAdd.menu.${key}`)}</Text>
              <Text variant="footnote" color="ink3">{t(`quickAdd.menu.${key}Body`)}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60 },
  tile: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
});
