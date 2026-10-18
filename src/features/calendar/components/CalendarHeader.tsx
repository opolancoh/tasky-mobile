import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTasks } from '@/data/tasks/queries';
import { Text, useTheme } from '@/shared/ui';

import { useCalendarView, type CalendarView } from '../calendarViewStore';

const VIEWS: { view: CalendarView; icon: ComponentProps<typeof Feather>['name'] }[] = [
  { view: 'list', icon: 'list' },
  { view: 'calendar', icon: 'calendar' },
];

/**
 * The Calendar tab's top (M72, M74): the List | Calendar switch at the right of the bar (two icons, kept on the device),
 * then "Calendar" with every open task's count and the overdue ones in red.
 */
export function CalendarHeader({ overdue }: { overdue: number }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const view = useCalendarView((s) => s.view);
  const setView = useCalendarView((s) => s.setView);
  const total = useTasks({ limit: 1 }).data?.total;

  return (
    <View style={{ paddingBottom: space.sm }}>
      <View style={styles.bar}>
        <View accessibilityRole="tablist" accessibilityLabel={t('calendar.view.label')} style={[styles.switch, { backgroundColor: colors.surface2 }]}>
          {VIEWS.map((v) => {
            const on = v.view === view;
            return (
              <Pressable
                key={v.view}
                onPress={() => setView(v.view)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t(`calendar.view.${v.view}`)}
                style={[styles.segment, on && [styles.on, { backgroundColor: colors.surface, shadowColor: colors.ink }]]}
              >
                <Feather name={v.icon} size={17} color={on ? colors.accent : colors.ink2} />
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text variant="label" color="ink3">{t('calendar.eyebrow')}</Text>
      <Text variant="largeTitle" accessibilityRole="header">{t('calendar.title')}</Text>
      {total !== undefined && total !== null && (
        <Text variant="subhead" color="ink2" style={{ marginTop: space.xxs }}>
          {t('browse.openCount', { count: total })}
          {overdue > 0 && <Text variant="subhead" color="danger">{` · ${t('calendar.overdueCount', { count: overdue })}`}</Text>}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', minHeight: 44 },
  switch: { flexDirection: 'row', borderRadius: 9, padding: 2 },
  segment: { width: 40, height: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  on: { shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
