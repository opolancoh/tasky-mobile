import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCompleteTask, useReopenTask } from '@/data/tasks/mutations';
import type { LocalDate } from '@/core/types';
import type { SearchMatch, TaskSummary } from '@/data/tasks/types';
import { CheckCircle, TaskMarks, TaskMeta, useTaskCheck } from '@/shared/components';
import { useHoldActions } from '@/shared/hold/useHoldActions';
import { SelectCheck } from '@/shared/selection/SelectCheck';
import { selectable, useRowSelection, useSelection } from '@/shared/selection/selectionStore';
import { fonts, Text, useTheme } from '@/shared/ui';

/** Lower case without accents, so "Café" matches "cafe" (the API ignores both). */
const fold = (s: string) => s.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

/** The query's words, folded, for bolding the matches. */
export const searchWords = (q: string) => fold(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** As the API (D115): a word in `text` starts with each searched word; a single letter must be a whole word. */
export const matchesAll = (text: string, words: string[]) => {
  const own = searchWords(text);
  return words.every((w) => own.some((o) => (w.length < 2 ? o === w : o.startsWith(w))));
};

/** `text` with the words that start with a searched word in bold. */
export function Highlight({ text, words, color = 'ink', strong = 'heading', variant = 'body', lines }: { text: string; words: string[]; color?: 'ink' | 'ink2' | 'ink3'; strong?: 'heading' | 'ink' | 'ink2'; variant?: 'body' | 'subhead'; lines?: number }) {
  return (
    <Text variant={variant} numberOfLines={lines} color={color}>
      {text.split(/([\p{L}\p{N}]+)/u).map((p, i) =>
        words.some((w) => fold(p).startsWith(w)) ? <Text key={i} variant={variant === 'body' ? 'bodyMedium' : 'subhead'} color={strong} style={variant === 'body' ? undefined : styles.strong}>{p}</Text> : p,
      )}
    </Text>
  );
}

/**
 * A search result (M40): the circle (completes an open task; a completed one shows its check and reopens), the title with
 * the words found in bold, then the line and the right of every task row (`TaskMeta`, `TaskMarks`). On hold (D91, M80): the
 * pause icon (Resume, Complete, Edit the reason). A long press starts selecting (M81); while selecting, a tap picks it.
 */
export function SearchRow({ task, match, words, today, onPress }: { task: TaskSummary; match?: SearchMatch; words: string[]; today: LocalDate | undefined; onPress(): void }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const complete = useCompleteTask();
  const reopen = useReopenTask();
  // The circle follows the task: the toggle changes it in the search results at once (M75), and back if the API says no.
  const done = task.status === 'completed';
  const held = task.status === 'onHold';
  const holds = useHoldActions();
  const { saving, tap: toggle } = useTaskCheck(task, (x) => (x.status === 'completed' ? reopen.mutate(x) : complete.mutate(x)));
  const selection = useRowSelection(task.id);
  const pickable = selectable(task);
  const selecting = selection.selecting;
  const startSelecting = () => useSelection.getState().start(selection.key, task);
  return (
    <Pressable
      onPress={selecting ? () => useSelection.getState().toggle(task) : onPress}
      onLongPress={!selecting && pickable ? startSelecting : undefined}
      disabled={selecting ? !pickable : saving}
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: selection.picked } : { busy: saving }}
      accessibilityActions={!selecting && pickable ? [{ name: 'longpress', label: t('select.selectTasks') }] : undefined}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && startSelecting()}
    >
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.md, backgroundColor: selecting && selection.picked ? colors.accentSoft : pressed ? colors.surface2 : 'transparent' }]}>
          {selecting ? (
            <SelectCheck picked={selection.picked} />
          ) : held ? (
            <Pressable onPress={() => holds.heldMenu(task)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('hold.menuLabel', { title: task.title })} style={styles.pause}>
              <Feather name="pause-circle" size={22} color={colors.warn} />
            </Pressable>
          ) : (
            <CheckCircle checked={done} saving={saving} onPress={toggle} label={t(done ? 'search.reopen' : 'taskRow.complete', { title: task.title })} />
          )}
          <View style={styles.main}>
            <Highlight text={task.title} words={words} lines={2} color={done ? 'ink3' : 'ink'} strong={done ? 'ink2' : 'heading'} />
            {match && <MatchLine match={match} task={task} words={words} />}
            <TaskMeta task={task} today={today} showDue />
          </View>
          {!done && <TaskMarks task={task} />}
        </View>
      )}
    </Pressable>
  );
}

/** Under the title, where the words were found (D115): the tags that match, a step, the notes or a comment. */
function MatchLine({ match, task, words }: { match: SearchMatch; task: TaskSummary; words: string[] }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  if (match.in === 'tag') {
    const tags = task.tags.filter((g) => words.some((w) => searchWords(g.name).some((o) => o.startsWith(w))));
    return tags.length ? <Highlight text={tags.map((g) => `#${g.name}`).join('  ')} words={words} variant="subhead" color="ink2" strong="ink" lines={1} /> : null;
  }
  if (!match.text) return null;
  const text = match.in === 'comment' ? match.text : `${t(match.in === 'step' ? 'search.inStep' : 'search.inNotes')} ${match.text}`;
  return (
    <View style={[styles.match, { gap: space.xs }]}>
      {match.in === 'comment' && <Feather name="message-circle" size={13} color={colors.ink3} />}
      <View style={styles.shrink}><Highlight text={text} words={words} variant="subhead" color="ink2" strong="ink" lines={1} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  strong: { fontFamily: fonts.medium },
  match: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0, gap: 3 },
  shrink: { flexShrink: 1 },
  pause: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },   // important: the last item of the meta line (M44)
});
