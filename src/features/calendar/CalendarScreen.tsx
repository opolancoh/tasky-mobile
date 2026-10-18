import { StyleSheet, View } from 'react-native';

import { todayIn } from '@/core/dates/localDate';
import { useMe } from '@/data/tenancy/queries';
import { Screen, SkeletonRow } from '@/shared/ui';

import { useCalendarView } from './calendarViewStore';
import { DaysView } from './DaysView';
import { MonthView } from './MonthView';

/**
 * Calendar, the third tab (06-mobile.md, M72, M74): every open task the user can see by due date, titled "Calendar" with
 * no back button. List (one scroll from today) or Calendar (a month or a week), switched in the bar and kept on the device.
 * Days are the profile's (its time zone).
 */
export function CalendarScreen() {
  const view = useCalendarView((s) => s.view);
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  return (
    <Screen edges={['top']} contentStyle={styles.fill}>
      {!today ? (
        <View style={{ paddingTop: 96 }}>{[70, 55, 62].map((w) => <SkeletonRow key={w} width={w} />)}</View>
      ) : view === 'list' ? (
        <DaysView today={today} />
      ) : (
        <MonthView today={today} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
