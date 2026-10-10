import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/ui';

export interface BarItem {
  key: string;
  icon: 'flag' | 'calendar' | 'bell' | 'user' | 'tag' | 'file-text';
  label: string;
  /** What the field holds, read after the label; undefined when unset. */
  value?: string;
  /** Important is red; the others use the accent. */
  danger?: boolean;
  onPress(): void;
}

/**
 * Quick add's bottom bar (06-mobile.md, M18, style E): five bare icons evenly spread, on the sheet's
 * own background with a hairline on top. A set field is tinted with a dot under it; no labels.
 */
export function QuickAddBar({ items }: { items: BarItem[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View accessibilityRole="toolbar" accessibilityLabel={t('quickAdd.toolbar')} style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.line }]}>
      {items.map((it) => {
        const set = it.value !== undefined;
        const tint = set ? (it.danger ? colors.danger : colors.accent) : colors.ink3;
        return (
          <Pressable
            key={it.key}
            onPress={() => {
              Keyboard.dismiss();   // a bar choice isn't typing: the keyboard goes away (M30)
              it.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={set ? `${it.label}: ${it.value}` : it.label}
            accessibilityState={{ selected: set }}
            style={styles.item}
          >
            <Feather name={it.icon} size={22} color={tint} />
            <View style={[styles.dot, { backgroundColor: set ? tint : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 56, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  item: { width: 58, height: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
