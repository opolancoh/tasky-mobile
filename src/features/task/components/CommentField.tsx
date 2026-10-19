import { Feather } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { Id } from '@/core/types';
import { useCommentActions } from '@/data/tasks/mutations';
import { taskLimits, type Comment, type UserRef } from '@/data/tasks/types';
import { Avatar } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { radius, Text, useDelayedFlag, useTheme } from '@/shared/ui';

import { plainText, toBody, typedMention } from './mentions';

/**
 * The comment field docked at the bottom of Task detail (M82, the hub's A): "Add a comment", ↑ to send (saves at once,
 * apart from the task's Save). Typing **@** shows a strip of faces above it, the people who see the task, narrowed by
 * what follows; a tap puts "@Luis" in the text, sent as their token. `editing`: one of the user's comments, its text in
 * the field, with Cancel. The text lives here (docs/performance.md).
 */
export function CommentField({ taskId, people, editing, onDone }: { taskId: Id; people: UserRef[]; editing: Comment | null; onDone(): void }) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const { add, update } = useCommentActions(taskId);
  const saving = editing ? update : add;
  const spinner = useDelayedFlag(saving.isPending);
  const input = useRef<TextInput>(null);
  const [text, setText] = useState(() => (editing ? plainText(editing) : ''));
  const [picked, setPicked] = useState<UserRef[]>(() => editing?.mentions ?? []);
  const ready = text.trim().length > 0 && text.trim().length <= taskLimits.commentMax;

  const query = typedMention(text);
  const q = query?.toLocaleLowerCase();
  const matches = q === undefined ? [] : people.filter((p) => p.displayName.toLocaleLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || p.displayName.toLocaleLowerCase().startsWith(q));

  const change = (value: string) => {
    setText(value);
    if (saving.error) saving.reset();
  };
  const pick = (p: UserRef) => {
    setText((current) => current.replace(/@([^\s@]*)$/u, `@${p.displayName} `));
    setPicked((current) => (current.some((x) => x.id === p.id) ? current : [...current, p]));
    input.current?.focus();
  };
  const send = () => {
    if (!ready || saving.isPending) return;
    const sent = text;
    const body = toBody(sent, picked);
    const done = () => {
      setText((current) => (current === sent ? '' : current));
      setPicked([]);
      onDone();
    };
    if (editing) update.mutate({ id: editing.id, body }, { onSuccess: done });
    else add.mutate(body, { onSuccess: done });
  };

  return (
    <View style={[styles.band, { gap: space.xs, paddingVertical: space.sm, paddingHorizontal: space.lg, borderTopColor: colors.line, backgroundColor: colors.bg }]}>
      {editing && (
        <View style={[styles.editing, { paddingHorizontal: space.md }]}>
          <Text variant="footnote" color="ink2" style={styles.fill}>{t('comments.editing')}</Text>
          <Pressable onPress={onDone} hitSlop={8} accessibilityRole="button">
            <Text variant="footnote" color="accent">{t('common.cancel')}</Text>
          </Pressable>
        </View>
      )}
      {matches.length > 0 && (
        <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }} accessibilityLabel={t('comments.mention')}>
          {matches.map((p) => (
            <Pressable key={p.id} onPress={() => pick(p)} accessibilityRole="button" accessibilityLabel={t('comments.mentionName', { name: p.displayName })} style={({ pressed }) => [styles.chip, { gap: space.xs, backgroundColor: pressed ? colors.line : colors.surface2 }]}>
              <Avatar name={p.displayName} seed={p.id} size={22} />
              <Text variant="subhead">{p.displayName}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {saving.error && (
        <Text variant="footnote" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ paddingHorizontal: space.md }}>{errorMessage(saving.error)}</Text>
      )}
      <View style={[styles.field, { paddingLeft: space.md, backgroundColor: colors.surface, borderColor: saving.error ? colors.danger : colors.line }]}>
        <TextInput
          ref={input}
          value={text}
          onChangeText={change}
          placeholder={t('comments.add')}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          accessibilityLabel={t('comments.add')}
          multiline
          maxLength={taskLimits.commentMax}
          autoFocus={!!editing}
          style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }]}
        />
        <Pressable
          onPress={ready ? send : () => input.current?.focus()}
          disabled={saving.isPending}
          accessibilityRole="button"
          accessibilityLabel={t(editing ? 'comments.save' : 'comments.send')}
          accessibilityState={{ disabled: !ready || saving.isPending, busy: saving.isPending }}
          hitSlop={6}
          style={styles.sendHit}
        >
          <View style={[styles.send, { backgroundColor: ready ? colors.accent : colors.surface2 }]}>
            {spinner ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Feather name={editing ? 'check' : 'arrow-up'} size={18} color={ready ? colors.onAccent : colors.ink3} />}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { borderTopWidth: StyleSheet.hairlineWidth },
  editing: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', minHeight: 34, paddingLeft: 6, paddingRight: 12, borderRadius: 17 },
  field: { flexDirection: 'row', alignItems: 'flex-end', minHeight: 44, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingRight: 4, paddingBottom: 4 },
  input: { flex: 1, paddingTop: 10, paddingBottom: 6, maxHeight: 120 },
  sendHit: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  send: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
