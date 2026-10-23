import { Feather } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { isConnectionError } from '@/core/http/problem';
import type { Id } from '@/core/types';
import { newTaskId, useCreateTask } from '@/data/tasks/mutations';
import { taskLimits } from '@/data/tasks/types';
import { easeNextLayout } from '@/shared/components';
import { radius, useTheme } from '@/shared/ui';

/**
 * Adds a task to a list by its title (M62): a field docked at the bottom with ↑ at its end, grey while the title is
 * blank, accent once there is text. Return or ↑ adds (POST /tasks with the title only) and keeps the keyboard up for the
 * next one. Adding shows at once (M100): the field clears and the task is in the list, so the next one can be typed
 * and added right away. An error is a toast, or Can't connect's capsule with Try again; one Try again can't fix puts
 * the title back if the field is still empty. The typed title lives here, not in the screen (docs/performance.md).
 */
export function AddTaskField({ taskListId, listName, onAdded }: { taskListId: Id; listName: string; onAdded(): void }) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const create = useCreateTask();
  const input = useRef<TextInput>(null);
  const [title, setTitle] = useState('');
  const ready = title.trim().length > 0;

  const add = () => {
    const value = title.trim();
    if (!value) return;   // a blank title: Return does nothing
    setTitle('');
    easeNextLayout();   // the row eases in
    AccessibilityInfo.announceForAccessibility(t('browse.taskAdded', { title: value }));
    onAdded();
    // Per call, not the hook's last one: each task added in a row gets its own answer.
    create.mutateAsync({ id: newTaskId(), body: { taskListId, title: value } }).catch((error: unknown) => {
      if (!isConnectionError(error)) setTitle((current) => current || value);
    });
  };

  return (
    <View style={[styles.band, { paddingVertical: space.sm, marginHorizontal: -space.xxl, paddingHorizontal: space.lg, borderTopColor: colors.line, backgroundColor: colors.bg }]}>
      <View style={[styles.field, { paddingLeft: space.md, backgroundColor: colors.surface, borderColor: colors.line }]}>
        <TextInput
          ref={input}
          value={title}
          onChangeText={setTitle}
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
          accessibilityRole="button"
          accessibilityLabel={t('browse.addTaskSend')}
          accessibilityState={{ disabled: !ready }}
          hitSlop={6}
          style={styles.sendHit}
        >
          <View style={[styles.send, { backgroundColor: ready ? colors.accent : colors.surface2 }]}>
            <Feather name="arrow-up" size={18} color={ready ? colors.onAccent : colors.ink3} />
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
