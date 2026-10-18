import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, useTheme } from '@/shared/ui';

import type { OffDay } from '../useOffCalendar';

/** Overdue (red) and No date over the days, with their counts (M72); the open one is outlined. Hidden at 0. */
export function OffChips({ count, open, onPress }: { count(kind: OffDay): number; open: OffDay | null; onPress(kind: OffDay): void }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const kinds = (['overdue', 'none'] as const).filter((k) => count(k) > 0);
  if (!kinds.length) return null;
  return (
    <View style={[styles.row, { gap: space.sm, marginTop: space.md, marginBottom: space.xs }]}>
      {kinds.map((kind) => {
        const red = kind === 'overdue', on = open === kind;
        const tint = red ? colors.danger : colors.ink2;
        return (
          <Pressable
            key={kind}
            onPress={() => onPress(kind)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [
              styles.chip,
              { gap: space.xs + 2, paddingHorizontal: space.md, backgroundColor: red ? colors.dangerSoft : colors.surface2, borderColor: on ? tint : 'transparent', opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text variant="label" style={{ color: tint }}>{t(red ? 'calendar.overdue' : 'calendar.noDate')}</Text>
            <Text variant="label" style={{ color: red ? colors.danger : colors.ink }}>{count(kind)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', height: 32, borderRadius: 16, borderWidth: 1.5 },
});
