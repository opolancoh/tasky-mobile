import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Id } from '@/core/types';
import { useTaskLists } from '@/data/tasks/queries';
import { useQuickAdd } from '@/shared/quickAdd/quickAddStore';
import { radius, Text, useTheme } from '@/shared/ui';

const STEPS = ['task', 'date', 'list', 'share', 'reminder'] as const;
type Step = (typeof STEPS)[number];

/**
 * Get started (M67), only on a first day: not one task in the account yet. Five steps, each opening where it's done
 * (Quick add, or Browse for lists and sharing). Making or sharing a list ticks its step, from the task lists; the
 * steps about tasks can't be done without leaving the first day, and the card goes with it.
 */
export function GetStartedCard({ userId }: { userId: Id }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const showQuickAdd = useQuickAdd((s) => s.show);
  const lists = useTaskLists().data;

  const done: Record<Step, boolean> = {
    task: false,
    date: false,
    list: !!lists?.some((l) => !l.isInbox && l.owner.id === userId),
    share: !!lists?.some((l) => l.sharing !== 'private'),
    reminder: false,
  };
  const go: Record<Step, () => void> = {
    task: () => showQuickAdd(),
    date: () => showQuickAdd(),
    list: () => navigation.navigate('Tabs', { screen: 'Browse' }),
    share: () => navigation.navigate('Tabs', { screen: 'Browse' }),
    reminder: () => showQuickAdd(),
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface2, paddingHorizontal: space.lg, marginTop: space.xs }]}>
      <View style={[styles.head, { gap: space.sm }]}>
        <Text variant="headline" accessibilityRole="header">{t('home.getStarted.title')}</Text>
        <Text variant="footnote" color="ink3">{t('home.getStarted.progress', { done: STEPS.filter((s) => done[s]).length, total: STEPS.length })}</Text>
      </View>
      {STEPS.map((step) => {
        const ok = done[step];
        return (
          <Pressable
            key={step}
            onPress={ok ? undefined : go[step]}
            disabled={ok}
            accessibilityRole="button"
            accessibilityState={{ checked: ok, disabled: ok }}
            style={[styles.row, { gap: space.md, borderTopColor: colors.line }]}
          >
            <View style={[styles.circle, ok ? { backgroundColor: colors.success, borderColor: colors.success } : { borderColor: colors.ink3 }]}>
              {ok && <Feather name="check" size={13} color={colors.onAccent} />}
            </View>
            <View style={styles.fill}>
              <Text variant="bodyMedium" color={ok ? 'ink3' : 'ink'} style={ok ? styles.struck : undefined}>{t(`home.getStarted.${step}`)}</Text>
              {!ok && <Text variant="footnote" color="ink3">{t(`home.getStarted.${step}Sub`)}</Text>}
            </View>
            {!ok && <Feather name="chevron-right" size={18} color={colors.ink3} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl - 4, paddingVertical: 4 },
  head: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  circle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
  struck: { textDecorationLine: 'line-through' },
});
