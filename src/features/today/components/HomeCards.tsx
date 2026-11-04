import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { LocalDate } from '@/core/types';
import type { HomeCounts } from '@/data/tasks/types';
import { StatCard, StatGrid, StatGridSkeleton } from '@/shared/components/StatCard';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { useTheme } from '@/shared/ui';

import type { TodayListSection } from '../todaySections';

/** A thin progress bar: today's done of today's total, green when all are done. */
function Progress({ done, total }: { done: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.line }]}>
      <View style={[styles.fill, { width: `${total ? Math.round((done / total) * 100) : 0}%`, backgroundColor: done && done === total ? colors.success : colors.accent }]} />
    </View>
  );
}

/** Home's two cards (M105): Today ("3 of 9 done", a bar) and Overdue (since its oldest); each opens its screen. */
export function HomeCards({ counts, today, open }: { counts: HomeCounts; today: LocalDate; open(section: TodayListSection): void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const labels = useDateLabels(today);
  const left = counts.today;
  const total = left + counts.doneToday;
  const allDone = !left && counts.doneToday > 0;
  return (
    <StatGrid>
      {allDone ? (
        <StatCard tone="success" icon="calendar" count={<Feather name="check" size={26} color={colors.success} style={styles.check} />} label={t('home.today')} sub={t('home.allDoneCount', { count: counts.doneToday })} bar={<Progress done={1} total={1} />} onPress={() => open('today')} />
      ) : (
        <StatCard tone={left ? 'accent' : 'plain'} icon="calendar" count={left} label={t('home.today')} sub={total ? t('home.doneOf', { done: counts.doneToday, total }) : t('home.nothingTodayShort')} bar={total ? <Progress done={counts.doneToday} total={total} /> : undefined} onPress={() => open('today')} />
      )}
      <StatCard tone={counts.overdue ? 'danger' : 'plain'} icon="clock" count={counts.overdue} label={t('home.overdue')} sub={counts.overdue && counts.overdueSince ? t('home.since', { date: labels.day(counts.overdueSince) }) : t('home.nothingLate')} onPress={() => open('overdue')} />
    </StatGrid>
  );
}

/** The cards while GET /home loads (M27). */
export function HomeCardsSkeleton() {
  return <StatGridSkeleton count={2} />;
}

const styles = StyleSheet.create({
  check: { marginTop: 4 },
  track: { height: 4, borderRadius: 2, marginTop: 7, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
