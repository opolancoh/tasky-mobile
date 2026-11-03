import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Skeleton, Text, useTheme } from '@/shared/ui';

import type { CalendarMode } from '../calendarViewStore';

const MODES: { mode: CalendarMode; icon: ComponentProps<typeof Feather>['name'] }[] = [
  { mode: 'month', icon: 'calendar' },
  { mode: 'week', icon: 'columns' },
];

/**
 * The Calendar tab's top (M72, M74, M140): "Calendar" with Month | Week on its row (a calendar and a week icon), then a count of the month or week on
 * screen and the overdue ones in red ("17 tasks · 3 overdue", M99); `count` is undefined while the range loads.
 */
export function CalendarHeader({ overdue, count, mode, onMode }: { overdue: number; count?: number; mode: CalendarMode; onMode(mode: CalendarMode): void }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();

  return (
    <View style={{ paddingBottom: space.sm }}>
      <View style={[styles.row, { marginTop: space.lg, gap: space.md }]}>
        <Text variant="largeTitle" accessibilityRole="header" style={styles.title}>{t('calendar.title')}</Text>
        <View accessibilityRole="tablist" accessibilityLabel={t('calendar.mode.title')} style={[styles.switch, { backgroundColor: colors.surface2 }]}>
          {MODES.map((m) => {
            const on = m.mode === mode;
            return (
              <Pressable
                key={m.mode}
                onPress={() => onMode(m.mode)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t(`calendar.mode.${m.mode}`)}
                style={[styles.segment, on && [styles.on, { backgroundColor: colors.surface, shadowColor: colors.ink }]]}
              >
                <Feather name={m.icon} size={17} color={on ? colors.accent : colors.ink2} />
              </Pressable>
            );
          })}
        </View>
      </View>
      {count === undefined ? (
        <Skeleton width={120} height={12} style={{ marginTop: space.xs }} />
      ) : (
        <Text variant="subhead" color="ink2" style={{ marginTop: space.xxs }}>
          {t('calendar.tasksCount', { count })}
          {overdue > 0 && <Text variant="subhead" color="danger">{` · ${t('calendar.overdueCount', { count: overdue })}`}</Text>}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
  switch: { flexDirection: 'row', borderRadius: 9, padding: 2 },
  segment: { width: 40, height: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  on: { shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
