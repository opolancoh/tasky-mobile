import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, Skeleton, Text, useTheme } from '@/shared/ui';

export interface BrowseRowProps {
  label: string;
  /** The 30 pt tile: a Feather icon, a color dot, "#" or a team's initials. */
  icon: ReactNode;
  /** The tile's fill, e.g. the list's color, faint. */
  tint?: string;
  /** Open count; shown only above zero (or at zero with `zero`), and omitted for rows without one (Completed). */
  count?: number;
  /** Show the count at 0 too (Home's Assignments, M105). */
  zero?: boolean;
  /** A line under the name (Home's rows, M105): what it holds, or a red “2 late”. */
  sub?: ReactNode;
  /** What tells this row apart: a people icon (a list the user shares), the owner's name (shared with them). */
  aside?: ReactNode;
  onPress?(): void;
  /** The row's menu (M38). */
  onLongPress?(): void;
  /** Edit mode: up and down arrows instead of the count and chevron. */
  move?: { up?(): void; down?(): void };
}

/** A Spaces and Home row (M38, M105): tile, name (a line under it), aside, open count (hidden at 0), chevron. 48 pt tall. Long press opens its menu. */
export function BrowseRow({ label, icon, tint, count, zero, sub, aside, onPress, onLongPress, move }: BrowseRowProps) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  return (
    <Pressable
      onPress={move ? undefined : onPress}
      onLongPress={move ? undefined : onLongPress}
      disabled={!!move}
      accessibilityRole="button"
      accessibilityLabel={count !== undefined ? `${label}, ${t('browse.openCount', { count })}` : label}
      accessibilityActions={onLongPress && !move ? [{ name: 'longpress', label: t('browse.menu.title') }] : undefined}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && onLongPress?.()}
    >
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
          <View style={[styles.tile, { backgroundColor: tint ?? colors.accentSoft }]}>{icon}</View>
          {sub ? (
            <View style={styles.label}>
              <Text variant="body" numberOfLines={1}>{label}</Text>
              {typeof sub === 'string' ? <Text variant="footnote" color="ink3" numberOfLines={1}>{sub}</Text> : sub}
            </View>
          ) : (
            <Text variant="body" numberOfLines={1} style={styles.label}>{label}</Text>
          )}
          {aside}
          {move ? (
            <View style={styles.arrows}>
              <Arrow name="chevron-up" onPress={move.up} label={t('browse.moveUp')} />
              <Arrow name="chevron-down" onPress={move.down} label={t('browse.moveDown')} />
            </View>
          ) : (
            <>
              {(!!count || (zero && count === 0)) && <Text variant="callout" color="ink3" style={styles.count}>{count}</Text>}
              <Feather name="chevron-right" size={18} color={colors.ink3} />
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

/** A Spaces row being loaded (M27, M70): the tile, the name (`width`, in percent) and a short count, as tall as a row. */
export function BrowseRowSkeleton({ width }: { width: number }) {
  const { space } = useTheme();
  return (
    <View style={[styles.row, { gap: space.md }]}>
      <Skeleton width={30} height={30} radius={radius.sm + 1} />
      <View style={styles.label}>
        <Skeleton width={`${width}%`} height={14} />
      </View>
      <Skeleton width={18} height={12} />
    </View>
  );
}

function Arrow({ name, onPress, label }: { name: ComponentProps<typeof Feather>['name']; onPress?(): void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.arrow}>
      <Feather name={name} size={20} color={onPress ? colors.accent : colors.line} />
    </Pressable>
  );
}

/** The aside for a list the user shares with others. */
export function SharedMark() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return <Feather name="users" size={14} color={colors.ink3} accessibilityLabel={t('browse.shared')} />;
}

/** The aside for someone else's list: their first name. */
export function OwnerMark({ name }: { name: string }) {
  return <Text variant="subhead" color="ink3" numberOfLines={1} style={styles.owner}>{name.split(' ')[0]}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingVertical: 4 },
  tile: { width: 30, height: 30, borderRadius: radius.sm + 1, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0 },
  count: { fontVariant: ['tabular-nums'] },
  owner: { maxWidth: '35%' },
  arrows: { flexDirection: 'row' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
