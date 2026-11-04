import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fonts, radius, Skeleton, Text, useTheme } from '@/shared/ui';

export type StatTone = 'accent' | 'danger' | 'success' | 'plain';

/** A card on Home and a team's screen (M105, M144): the count (or a check), an icon at the right, a name and one line; grey at 0. */
export function StatCard({ tone, icon, count, label, sub, bar, onPress }: { tone: StatTone; icon: ComponentProps<typeof Feather>['name']; count: ReactNode; label: string; sub: string; bar?: ReactNode; onPress(): void }) {
  const { colors, space } = useTheme();
  const [bg, fg] = tone === 'accent' ? [colors.accentSoft, colors.accent] : tone === 'danger' ? [colors.dangerSoft, colors.danger] : tone === 'success' ? [colors.successSoft, colors.success] : [colors.surface2, colors.ink3];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${typeof count === 'number' ? `${count}, ` : ''}${sub}`} style={styles.cell}>
      {({ pressed }) => (
        <View style={[styles.card, { backgroundColor: bg, padding: space.md, opacity: pressed ? 0.8 : 1 }]}>
          <View style={styles.top}>
            {typeof count === 'number' ? <Text style={[styles.count, { color: tone === 'plain' ? colors.ink3 : fg }]}>{count}</Text> : count}
            <Feather name={icon} size={18} color={fg} style={styles.icon} />
          </View>
          <Text variant="label">{label}</Text>
          <Text variant="caption" color="ink3" numberOfLines={1}>{sub}</Text>
          {bar}
        </View>
      )}
    </Pressable>
  );
}

/** Cards two by two. */
export function StatGrid({ children }: { children: ReactNode }) {
  const { space } = useTheme();
  return <View style={[styles.grid, { rowGap: space.md }]}>{children}</View>;
}

/** `count` cards while their numbers load (M27). */
export function StatGridSkeleton({ count }: { count: number }) {
  return (
    <StatGrid>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.cell}>
          <Skeleton width="100%" height={96} radius={radius.xl - 4} />
        </View>
      ))}
    </StatGrid>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'stretch' },
  cell: { width: '48.5%' },
  card: { flex: 1, borderRadius: radius.xl - 4, minHeight: 96, gap: 1 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: 34 },
  count: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  icon: { marginTop: 4 },
});
