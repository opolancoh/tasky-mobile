import { Feather } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { Id } from '@/core/types';
import { useCreateTask } from '@/data/tasks/mutations';
import { taskLimits } from '@/data/tasks/types';
import { errorMessage } from '@/shared/i18n/errors';
import { radius, Text, useDelayedFlag, useTheme } from '@/shared/ui';

/**
 * Adds a task to a list by its title (M62): a field docked at the bottom with ↑ at its end, grey while the title is
 * blank, accent once there is text. Return or ↑ adds (POST /tasks with the title only) and keeps the keyboard up for the
 * next one. Saving follows M56: ↑ busy, the field editable, success clears it unless changed meanwhile, an error above
 * it until the next keystroke. The typed title lives here, not in the screen (docs/performance.md).
 */
export function AddTaskField({ taskListId, listName, onAdded }: { taskListId: Id; listName: string; onAdded(): void }) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const create = useCreateTask();
  const spinner = useDelayedFlag(create.isPending);
  const input = useRef<TextInput>(null);
  const [title, setTitle] = useState('');
  const ready = title.trim().length > 0;

  const change = (text: string) => {
    setTitle(text);
    if (create.error) create.reset();
  };
  const add = () => {
    const value = title.trim();
    if (!value || create.isPending) return;   // a blank title, or the last one still saving: Return does nothing
    create.mutate(
      { body: { taskListId, title: value } },
      {
        onSuccess: () => {
          setTitle((current) => (current.trim() === value ? '' : current));
          AccessibilityInfo.announceForAccessibility(t('browse.taskAdded', { title: value }));
          onAdded();
        },
      },
    );
  };

  return (
    <View style={[styles.band, { gap: space.xs, paddingVertical: space.sm, marginHorizontal: -space.xxl, paddingHorizontal: space.lg, borderTopColor: colors.line, backgroundColor: colors.bg }]}>
      {create.error && (
        <Text variant="footnote" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ paddingHorizontal: space.md }}>
          {errorMessage(create.error)}
        </Text>
      )}
      <View style={[styles.field, { paddingLeft: space.md, backgroundColor: colors.surface, borderColor: create.error ? colors.danger : colors.line }]}>
        <TextInput
          ref={input}
          value={title}
          onChangeText={change}
          placeholder={t('browse.addTask')}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          accessibilityLabel={t('browse.addTaskTo', { name: listName })}
          submitBehavior="submit"   // Return adds and keeps the keyboard for the next one
          onSubmitEditing={add}
          maxLength={taskLimits.titleMax}
          style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }]}
        />
        <Pressable
          // Blank: a tap only focuses the field. With a title: adds, like Return.
          onPress={ready ? add : () => input.current?.focus()}
          disabled={create.isPending}
          accessibilityRole="button"
          accessibilityLabel={t('browse.addTaskSend')}
          accessibilityState={{ disabled: !ready || create.isPending, busy: create.isPending }}
          hitSlop={6}
          style={styles.sendHit}
        >
          <View style={[styles.send, { backgroundColor: ready ? colors.accent : colors.surface2 }]}>
            {spinner ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Feather name="arrow-up" size={18} color={ready ? colors.onAccent : colors.ink3} />}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { borderTopWidth: StyleSheet.hairlineWidth },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingRight: 4 },
  input: { flex: 1, paddingVertical: 10 },
  sendHit: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  send: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
