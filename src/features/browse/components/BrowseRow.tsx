import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, Text, useTheme } from '@/shared/ui';

export interface BrowseRowProps {
  label: string;
  /** The 30 pt tile: a Feather icon, a color dot, "#" or a team's initials. */
  icon: ReactNode;
  /** The tile's fill, e.g. the list's color, faint. */
  tint?: string;
  /** Open count; omitted for rows without one (Completed). */
  count?: number;
  /** What tells this row apart: a people icon (a list the user shares), the owner's name (shared with them). */
  aside?: ReactNode;
  onPress?(): void;
  /** The row's menu (M38). */
  onLongPress?(): void;
  /** Edit mode: up and down arrows instead of the count and chevron. */
  move?: { up?(): void; down?(): void };
}

/** A Browse row (M38): tile, name, aside, open count, chevron. 48 pt tall. Long press opens its menu. */
export function BrowseRow({ label, icon, tint, count, aside, onPress, onLongPress, move }: BrowseRowProps) {
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
          <Text variant="body" numberOfLines={1} style={styles.label}>{label}</Text>
          {aside}
          {move ? (
            <View style={styles.arrows}>
              <Arrow name="chevron-up" onPress={move.up} label={t('browse.moveUp')} />
              <Arrow name="chevron-down" onPress={move.down} label={t('browse.moveDown')} />
            </View>
          ) : (
            <>
              {count !== undefined && <Text variant="callout" color="ink3" style={styles.count}>{count}</Text>}
              <Feather name="chevron-right" size={18} color={colors.ink3} />
            </>
          )}
        </View>
      )}
    </Pressable>
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
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  tile: { width: 30, height: 30, borderRadius: radius.sm + 1, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0 },
  count: { fontVariant: ['tabular-nums'] },
  owner: { maxWidth: '35%' },
  arrows: { flexDirection: 'row' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
