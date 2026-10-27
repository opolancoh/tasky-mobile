import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { useCommentActions } from '@/data/tasks/mutations';
import { taskLimits, type UserRef } from '@/data/tasks/types';
import { Avatar } from '@/shared/components';
import { errorMessage } from '@/shared/i18n/errors';
import { confirm, Sheet, Text, useTheme } from '@/shared/ui';

import { useCommentSheet } from '../commentSheetStore';
import { plainText, toBody, typedMention } from './mentions';

/**
 * Writing a comment (D92, M110): the large sheet page, as Quick add's Notes (M28), opened by Task detail's "+ Add a
 * comment" and a comment's Edit. Cancel · Comment · Send (Save when editing); sent at once, apart from the task's Save.
 * Typing **@** shows a strip of faces over the text, the people who see the task, narrowed by what follows; a tap puts
 * "@Luis" in the text, sent as their token. Leaving with text asks first. Mounted once in App.
 */
export function CommentSheet() {
  const session = useCommentSheet((s) => s.session);
  return session ? <CommentPage key={session} /> : null;
}

function CommentPage() {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const open = useCommentSheet((s) => s.open);
  const hide = useCommentSheet((s) => s.hide);
  const [{ taskId, people, editing }] = useState(() => useCommentSheet.getState());
  const { add, update } = useCommentActions(taskId);
  const saving = editing ? update : add;
  const input = useRef<TextInputInstance>(null);
  const [text, setText] = useState(() => (editing ? plainText(editing) : ''));
  const [picked, setPicked] = useState<UserRef[]>(() => editing?.mentions ?? []);
  const ready = text.trim().length > 0 && text.trim().length <= taskLimits.commentMax;
  const changed = text.trim() !== (editing ? plainText(editing) : '').trim();

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
    const body = toBody(text, picked);
    if (editing) update.mutate({ id: editing.id, body }, { onSuccess: hide });
    else add.mutate(body, { onSuccess: hide });
  };
  const leave = async () => {
    if (saving.isPending) return;
    if (changed && !(await confirm({ title: t('comments.discardTitle'), confirmLabel: t('comments.discard'), cancelLabel: t('comments.keepWriting') }))) return;
    hide();
  };

  return (
    <Sheet
      visible={open}
      onDismiss={leave}
      dismissLabel={t('common.close')}
      title={t(editing ? 'comments.editTitle' : 'comments.pageTitle')}
      left={{ label: t('common.cancel'), onPress: leave }}
      right={{ label: t(editing ? 'common.save' : 'comments.send'), emphasis: true, disabled: !ready || saving.isPending, onPress: send }}
    >
      {matches.length > 0 && (
        <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }} style={{ flexGrow: 0, marginBottom: space.sm }} accessibilityLabel={t('comments.mention')}>
          {matches.map((p) => (
            <Pressable key={p.id} onPress={() => pick(p)} accessibilityRole="button" accessibilityLabel={t('comments.mentionName', { name: p.displayName })} style={({ pressed }) => [styles.chip, { gap: space.xs, backgroundColor: pressed ? colors.line : colors.surface2 }]}>
              <Avatar name={p.displayName} seed={p.id} size={22} />
              <Text variant="subhead">{p.displayName}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {saving.error && (
        <View style={{ marginBottom: space.sm }}>
          <Text variant="footnote" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">{errorMessage(saving.error)}</Text>
        </View>
      )}
      <TextInput
        ref={input}
        value={text}
        onChangeText={change}
        placeholder={t('comments.placeholder')}
        placeholderTextColor={colors.ink3}
        selectionColor={colors.accent}
        accessibilityLabel={t('comments.add')}
        autoFocus
        multiline
        editable={!saving.isPending}
        maxLength={taskLimits.commentMax}
        textAlignVertical="top"
        style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }]}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', minHeight: 34, paddingLeft: 6, paddingRight: 12, borderRadius: 17 },
  /** As Quick add's Notes; no lineHeight (it clips descenders on iOS). */
  input: { height: 260, padding: 0, paddingTop: 4 },
});
