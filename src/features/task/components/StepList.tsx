import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useShallow } from 'zustand/react/shallow';

import { taskLimits } from '@/data/tasks/types';
import { Text, useTheme } from '@/shared/ui';

import type { DraftStep } from '../taskDraft';
import { useTaskDraft } from '../taskDraftStore';

let newKey = 0;

const setSteps = (change: (steps: DraftStep[]) => DraftStep[]) => {
  const { draft, edit } = useTaskDraft.getState();
  if (draft) edit({ steps: change(draft.steps) });
};

/**
 * Task detail's steps, edited in the draft (M26): "2 of 5" with a progress line, then each step (tick, rename in place,
 * swipe left to delete; screen readers get a Delete action), then "Add a step". Each row reads only its own step,
 * so typing redraws one row. Steps are capped at 100, so a plain list in the screen's scroll view is enough
 * (docs/performance.md, rule 3).
 */
export function StepList({ canAdd }: { canAdd: boolean }) {
  const { t } = useTranslation();
  const { colors, radius, space } = useTheme();
  const keys = useTaskDraft(useShallow((s) => s.draft?.steps.map((x) => x.key) ?? []));
  const done = useTaskDraft((s) => s.draft?.steps.filter((x) => x.isDone).length ?? 0);

  return (
    <View style={{ marginTop: space.xxl }}>
      <View style={[styles.head, { marginBottom: space.sm }]}>
        <Text variant="label" color="ink2" accessibilityRole="header">
          {t('taskDetail.steps')}
        </Text>
        {keys.length > 0 && (
          <Text variant="label" color="ink3">
            {t('taskRow.steps', { done, total: keys.length })}
          </Text>
        )}
      </View>
      {keys.length > 0 && (
        <View style={[styles.track, { backgroundColor: colors.surface2, borderRadius: radius.pill, marginBottom: space.xs }]}>
          <View style={[styles.fill, { width: `${(done / keys.length) * 100}%`, backgroundColor: colors.accent, borderRadius: radius.pill }]} />
        </View>
      )}
      {keys.map((key) => (
        <StepRow key={key} stepKey={key} />
      ))}
      {canAdd && keys.length < taskLimits.stepsMax && <AddStep />}
    </View>
  );
}

function StepRow({ stepKey }: { stepKey: string }) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const step = useTaskDraft((s) => s.draft?.steps.find((x) => x.key === stepKey));
  if (!step) return null;

  const update = (changes: Partial<DraftStep>) => setSteps((steps) => steps.map((x) => (x.key === stepKey ? { ...x, ...changes } : x)));
  const remove = () => setSteps((steps) => steps.filter((x) => x.key !== stepKey));
  // A step can't be blank: an emptied one goes back to its saved title, or away if it's new.
  const endEditing = () => {
    if (step.title.trim()) return;
    const saved = useTaskDraft.getState().base?.steps.find((x) => x.key === stepKey);
    if (saved) update({ title: saved.title });
    else remove();
  };

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          onPress={() => {
            methods.close();
            remove();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('taskDetail.deleteStep')}
          style={[styles.delete, { backgroundColor: colors.danger, paddingHorizontal: space.lg }]}
        >
          <Feather name="trash-2" size={18} color={colors.onAccent} />
        </Pressable>
      )}
    >
      <View
        style={[styles.row, { gap: space.md, backgroundColor: colors.bg }]}
        accessibilityActions={[{ name: 'delete', label: t('taskDetail.deleteStep') }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && remove()}
      >
        <Pressable
          onPress={() => update({ isDone: !step.isDone })}
          hitSlop={12}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: step.isDone }}
          accessibilityLabel={step.title}
          style={[styles.check, { borderColor: step.isDone ? colors.accent : colors.ink3, backgroundColor: step.isDone ? colors.accent : 'transparent' }]}
        >
          {step.isDone && <Feather name="check" size={12} color={colors.onAccent} />}
        </Pressable>
        <TextInput
          value={step.title}
          onChangeText={(title) => update({ title })}
          onEndEditing={endEditing}
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
          multiline
          maxLength={taskLimits.stepTitleMax}
          selectionColor={colors.accent}
          accessibilityLabel={t('taskDetail.stepTitle')}
          style={[
            styles.input,
            { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: step.isDone ? colors.ink3 : colors.ink },
            step.isDone && styles.done,
          ]}
        />
      </View>
    </ReanimatedSwipeable>
  );
}

function AddStep() {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const [title, setTitle] = useState('');   // typed text stays here until Return adds it

  const add = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSteps((steps) => [...steps, { key: `new-${++newKey}`, title: trimmed, isDone: false }]);
    setTitle('');
  };

  return (
    <View style={[styles.row, { gap: space.md }]}>
      <Feather name="plus" size={19} color={colors.accent} />
      <TextInput
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={add}
        submitBehavior="submit"
        returnKeyType="done"
        placeholder={t('taskDetail.addStep')}
        placeholderTextColor={colors.ink3}
        maxLength={taskLimits.stepTitleMax}
        selectionColor={colors.accent}
        accessibilityLabel={t('taskDetail.addStep')}
        style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 4, overflow: 'hidden' },
  fill: { height: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  check: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
  /** No lineHeight on a TextInput (it clips descenders on iOS). */
  input: { flex: 1, paddingVertical: 10, paddingHorizontal: 0 },
  done: { textDecorationLine: 'line-through' },
  delete: { justifyContent: 'center', alignItems: 'center', minWidth: 64 },
});
