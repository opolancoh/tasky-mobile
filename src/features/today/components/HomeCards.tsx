import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LocalDate } from '@/core/types';
import type { Home } from '@/data/tasks/types';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { fonts, radius, Skeleton, Text, useTheme } from '@/shared/ui';

import type { TodayListSection } from '../todaySections';

type Tone = 'accent' | 'danger' | 'success' | 'plain';

/** One card: the count (or a check), an icon at the right, a name and one line; grey at 0. Opens its See all (M33). */
function Card({ tone, icon, count, label, sub, bar, onPress }: { tone: Tone; icon: ComponentProps<typeof Feather>['name']; count: ReactNode; label: string; sub: string; bar?: ReactNode; onPress(): void }) {
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

/** A thin progress bar: today's done of today's total, green when all are done. */
function Progress({ done, total }: { done: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.line }]}>
      <View style={[styles.fill, { width: `${total ? Math.round((done / total) * 100) : 0}%`, backgroundColor: done && done === total ? colors.success : colors.accent }]} />
    </View>
  );
}

/**
 * Home's four cards (M65): Today, Overdue, Important, Personal; each opens its full list. Important and Personal open the
 * same screens as Spaces, so their rows are the same everywhere.
 */
export function HomeCards({ data, today, open, openImportant, openPersonal }: { data: Home; today: LocalDate; open(section: TodayListSection): void; openImportant(): void; openPersonal(): void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const labels = useDateLabels(today);
  const left = data.today.total ?? 0;
  const total = left + data.doneToday;
  const allDone = !left && data.doneToday > 0;
  const overdue = data.overdue.total ?? 0;
  const oldest = data.overdue.items[0]?.dueDate;
  return (
    <View style={styles.grid}>
      {allDone ? (
        <Card tone="success" icon="calendar" count={<Feather name="check" size={26} color={colors.success} style={styles.check} />} label={t('home.today')} sub={t('home.allDoneCount', { count: data.doneToday })} bar={<Progress done={1} total={1} />} onPress={() => open('today')} />
      ) : (
        <Card tone={left ? 'accent' : 'plain'} icon="calendar" count={left} label={t('home.today')} sub={total ? t('home.doneOf', { done: data.doneToday, total }) : t('home.nothingTodayShort')} bar={total ? <Progress done={data.doneToday} total={total} /> : undefined} onPress={() => open('today')} />
      )}
      <Card tone={overdue ? 'danger' : 'plain'} icon="clock" count={overdue} label={t('home.overdue')} sub={overdue && oldest ? t('home.since', { date: labels.day(oldest) }) : t('home.nothingLate')} onPress={() => open('overdue')} />
      <Card tone={data.importantTotal ? 'danger' : 'plain'} icon="flag" count={data.importantTotal} label={t('home.important')} sub={t(data.importantTotal ? 'home.soonestFirst' : 'home.noneFlagged')} onPress={openImportant} />
      <Card tone={data.inboxTotal ? 'accent' : 'plain'} icon="inbox" count={data.inboxTotal} label={t('home.inbox')} sub={t(data.inboxTotal ? 'home.notInList' : 'home.allSorted')} onPress={openPersonal} />
    </View>
  );
}

/** The cards while GET /home loads (M27). */
export function HomeCardsSkeleton() {
  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.cell}>
          <Skeleton width="100%" height={96} radius={radius.xl - 4} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  cell: { width: '48.5%' },
  card: { borderRadius: radius.xl - 4, minHeight: 96, gap: 1 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: 34 },
  count: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  icon: { marginTop: 4 },
  check: { marginTop: 4 },
  track: { height: 4, borderRadius: 2, marginTop: 7, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
