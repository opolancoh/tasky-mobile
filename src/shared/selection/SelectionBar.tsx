import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TaskSummary } from '@/data/tasks/types';
import { HOLD_REASONS } from '@/shared/hold/useHoldActions';
import { chooseAction, Text, useTheme } from '@/shared/ui';

import { pickedTasks, useSelection } from './selectionStore';
import { useBulkActions } from './useBulkActions';

type IconName = ComponentProps<typeof Feather>['name'];

/**
 * The selection bar (M81, the hub's Bulk actions, A): where the tab bar or the add field was, six labelled icons:
 * Complete, Date, Assign, Move, Flag (Unflag when all are flagged), More (Put on hold, Delete). Over 10 tasks a batch
 * shows "Moving 7 of 23" with a thin line instead. `insetBottom`: on a tab screen, which has no bottom safe area of its own.
 */
export function SelectionBar({ insetBottom = false }: { insetBottom?: boolean }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const count = useSelection((s) => Object.keys(s.picked).length);
  const allFlagged = useSelection((s) => { const xs = Object.values(s.picked); return xs.length > 0 && xs.every((x) => x.isImportant); });
  const running = useSelection((s) => s.running);
  const progress = useSelection((s) => s.progress);
  const bulk = useBulkActions();
  const show = (sheet: 'date' | 'assign' | 'move') => useSelection.setState({ sheet });

  const holdMenu = async (tasks: TaskSummary[]) => {
    const reasons = HOLD_REASONS.map((r) => t(`hold.reason.${r}`));
    const one = tasks.length === 1 ? tasks[0] : null;
    const i = await chooseAction({
      title: one ? t('hold.title', { title: one.title }) : t('select.holdTitle', { count: tasks.length }),
      actions: [
        ...reasons.map((label) => ({ label, icon: 'pause-circle' as const })),
        // One task can still take its own reason, until when and who resumes it (the Hold screen).
        ...(one ? [{ label: t('hold.other'), icon: 'edit-2' as const, more: true }, { label: t('hold.more'), icon: 'calendar' as const, more: true }] : []),
      ],
      cancelLabel: t('common.cancel'),
    });
    if (i === null) return;
    if (i < reasons.length) bulk.hold(reasons[i]);
    else if (one) navigation.navigate('Hold', { taskId: one.id, mode: 'hold' });
  };

  const more = async () => {
    const tasks = pickedTasks();
    const i = await chooseAction({
      title: t('select.tasks', { count: tasks.length }),
      actions: [{ label: t('hold.put'), icon: 'pause-circle' }, { label: t('select.deleteAction'), icon: 'trash-2', destructive: true }],
      cancelLabel: t('common.cancel'),
    });
    if (i === 0) holdMenu(tasks);
    if (i === 1) bulk.remove();
  };

  const actions: { icon: IconName; label: string; run(): void }[] = [
    { icon: 'check-circle', label: t('select.complete'), run: bulk.complete },
    { icon: 'calendar', label: t('select.date'), run: () => show('date') },
    { icon: 'user', label: t('select.assign'), run: () => show('assign') },
    { icon: 'folder', label: t('select.move'), run: () => show('move') },
    { icon: 'flag', label: t(allFlagged ? 'select.unflag' : 'select.flag'), run: bulk.flag },
    { icon: 'more-horizontal', label: t('select.more'), run: more },
  ];
  const off = !count || running;

  return (
    <View style={[styles.bar, { borderTopColor: colors.line, backgroundColor: colors.bg, paddingBottom: insetBottom ? insets.bottom : 0 }]}>
      {progress ? (
        <View accessibilityLiveRegion="polite" style={[styles.progress, { gap: space.sm, paddingHorizontal: space.xl }]}>
          <Text variant="subhead" style={styles.tabular}>{t(`select.progress.${progress.verb}`, { done: progress.done, total: progress.total })}</Text>
          <View style={[styles.line, { backgroundColor: colors.surface2 }]}>
            <View style={[styles.fillLine, { width: `${Math.round((100 * progress.done) / progress.total)}%`, backgroundColor: colors.accent }]} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable key={a.icon} onPress={a.run} disabled={off} accessibilityRole="button" accessibilityLabel={a.label} accessibilityState={{ disabled: off }} style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}>
              <Feather name={a.icon} size={21} color={off ? colors.ink3 : colors.accent} />
              <Text variant="caption" color={off ? 'ink3' : 'accent'} style={styles.label} numberOfLines={1}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/** The top bar's left side while selecting: Cancel. */
export function SelectionCancel() {
  const { t } = useTranslation();
  const running = useSelection((s) => s.running);
  return (
    <Pressable onPress={() => useSelection.getState().end()} disabled={running} hitSlop={8} accessibilityRole="button" style={styles.side}>
      <Text variant="body" color={running ? 'ink3' : 'accent'}>{t('common.cancel')}</Text>
    </Pressable>
  );
}

/** The top bar's title while selecting: "3 selected", or "Select tasks" with none. */
export function SelectionTitle() {
  const { t } = useTranslation();
  const count = useSelection((s) => Object.keys(s.picked).length);
  return <Text variant="headline" accessibilityRole="header">{count ? t('select.selected', { count }) : t('select.selectTasks')}</Text>;
}

/**
 * The top bar's right side while selecting: All selects what's loaded ("All 20" on a list that pages, `paged`), None
 * when they all are.
 */
export function SelectionAll({ tasks, paged = false }: { tasks: TaskSummary[]; paged?: boolean }) {
  const { t } = useTranslation();
  const all = useSelection((s) => tasks.length > 0 && tasks.every((x) => !!s.picked[x.id]));
  const running = useSelection((s) => s.running);
  const label = all ? t('select.none') : paged ? t('select.allCount', { count: tasks.length }) : t('select.all');
  return (
    <Pressable onPress={() => useSelection.getState().setPicked(all ? [] : tasks)} disabled={running || !tasks.length} hitSlop={8} accessibilityRole="button" style={[styles.side, styles.right]}>
      <Text variant="body" color={running || !tasks.length ? 'ink3' : 'accent'}>{label}</Text>
    </Pressable>
  );
}

/** The three together, for a screen without a native header (Search). */
export function SelectionTopBar({ tasks, paged }: { tasks: TaskSummary[]; paged?: boolean }) {
  return (
    <View style={styles.top}>
      <View style={styles.third}><SelectionCancel /></View>
      <SelectionTitle />
      <View style={[styles.third, styles.end]}><SelectionAll tasks={tasks} paged={paged} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', minHeight: 56 },
  action: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 6 },
  label: { fontSize: 11 },
  progress: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  line: { alignSelf: 'stretch', height: 4, borderRadius: 2, overflow: 'hidden' },
  fillLine: { height: '100%' },
  side: { minHeight: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  top: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  third: { flex: 1 },
  end: { alignItems: 'flex-end' },
});
