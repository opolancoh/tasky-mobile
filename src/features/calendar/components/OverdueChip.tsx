import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, useTheme } from '@/shared/ui';

/** Overdue (red) over the days, with its count (M72); outlined while open. Hidden at 0. `label` names it otherwise ("Earlier", M99). */
export function OverdueChip({ count, open, onPress, label }: { count: number; open: boolean; onPress(): void; label?: string }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  if (!count) return null;
  return (
    <View style={[styles.row, { marginTop: space.md, marginBottom: space.xs }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: open }}
        style={({ pressed }) => [
          styles.chip,
          { gap: space.xs + 2, paddingHorizontal: space.md, backgroundColor: colors.dangerSoft, borderColor: open ? colors.danger : 'transparent', opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text variant="label" color="danger">{label ?? t('calendar.overdue')}</Text>
        <Text variant="label" color="danger">{count}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', height: 32, borderRadius: 16, borderWidth: 1.5 },
});
