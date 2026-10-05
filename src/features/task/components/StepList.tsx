import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import type { Step } from '@/data/tasks/types';
import { taskLimits } from '@/data/tasks/types';
import { Text, useTheme } from '@/shared/ui';

interface StepListProps {
  steps: Step[];
  /** Completed tasks take no new steps (the API refuses them). */
  canAdd: boolean;
  onToggle(step: Step): void;
  onRename(step: Step, title: string): void;
  onDelete(step: Step): void;
  onAdd(title: string): void;
}

/**
 * Task detail's steps (M25): "2 of 5" with a progress line, then each step (tick, rename in place, swipe left
 * to delete; screen readers get a Delete action), then "Add a step". Steps are capped at 100 per task, so a
 * plain list inside the screen's scroll view is enough (docs/performance.md, rule 3).
 */
export function StepList({ steps, canAdd, onToggle, onRename, onDelete, onAdd }: StepListProps) {
  const { t } = useTranslation();
  const { colors, radius, space } = useTheme();
  const done = steps.filter((s) => s.isDone).length;

  return (
    <View style={{ marginTop: space.xxl }}>
      <View style={[styles.head, { marginBottom: space.sm }]}>
        <Text variant="label" color="ink2" accessibilityRole="header">
          {t('taskDetail.steps')}
        </Text>
        {steps.length > 0 && (
          <Text variant="label" color="ink3">
            {t('taskRow.steps', { done, total: steps.length })}
          </Text>
        )}
      </View>
      {steps.length > 0 && (
        <View style={[styles.track, { backgroundColor: colors.surface2, borderRadius: radius.pill, marginBottom: space.xs }]}>
          <View style={[styles.fill, { width: `${(done / steps.length) * 100}%`, backgroundColor: colors.accent, borderRadius: radius.pill }]} />
        </View>
      )}
      {steps.map((step) => (
        <StepRow key={`${step.id}:${step.title}`} step={step} onToggle={() => onToggle(step)} onRename={(title) => onRename(step, title)} onDelete={() => onDelete(step)} />
      ))}
      {canAdd && steps.length < taskLimits.stepsMax && <AddStep onAdd={onAdd} />}
    </View>
  );
}

function StepRow({ step, onToggle, onRename, onDelete }: { step: Step; onToggle(): void; onRename(title: string): void; onDelete(): void }) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const [title, setTitle] = useState(step.title);   // typed text stays here (docs/performance.md, rule 2)

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) setTitle(step.title);   // a step can't be blank: put the old title back
    else if (trimmed !== step.title) onRename(trimmed);
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
            onDelete();
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
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
      >
        <Pressable
          onPress={onToggle}
          hitSlop={12}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: step.isDone }}
          accessibilityLabel={step.title}
          style={[styles.check, { borderColor: step.isDone ? colors.accent : colors.ink3, backgroundColor: step.isDone ? colors.accent : 'transparent' }]}
        >
          {step.isDone && <Feather name="check" size={12} color={colors.onAccent} />}
        </Pressable>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onEndEditing={save}
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

function AddStep({ onAdd }: { onAdd(title: string): void }) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const [title, setTitle] = useState('');

  const add = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
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
