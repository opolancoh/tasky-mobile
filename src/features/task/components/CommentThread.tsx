import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Id } from '@/core/types';
import { useCommentActions } from '@/data/tasks/mutations';
import { INLINE_MAX, useComments } from '@/data/tasks/queries';
import type { Comment } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { Avatar } from '@/shared/components';
import { errorMessage, toastError } from '@/shared/i18n/errors';
import { Button, chooseAction, confirm, Notice, SkeletonRow, Text, useTheme, useToast } from '@/shared/ui';

import { mentionParts, plainText } from './mentions';
import { useWhen } from './useWhen';

/**
 * A task's comments (D92, M82, the hub's A's): at the end of Task detail, newest last, the latest 20 and **Show earlier**;
 * past 60, **See all comments** on its own screen (M83, a FlashList). A tap on a comment opens its menu
 * (`useCommentMenu`). `highlight`: the comment a notification opened (tinted), `onHighlight` once it's on screen.
 * `onAdd`: "+ Add a comment" under the thread (M110).
 */
export function CommentThread({ taskId, count, highlight, onHighlight, onEdit, onAdd }: { taskId: Id; count: number; highlight?: Id; onHighlight(): void; onEdit(comment: Comment): void; onAdd?(): void }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const comments = useComments(taskId);
  const menu = useCommentMenu(taskId, onEdit);
  const loaded = comments.data?.pages.flatMap((p) => p.items) ?? [];
  const items = [...loaded].reverse();   // the API sends newest first
  const shown = useRef(false);
  const found = !!highlight && items.some((c) => c.id === highlight);
  useEffect(() => {
    if (found && !shown.current) {
      shown.current = true;
      onHighlight();
    }
  }, [found, onHighlight]);

  return (
    <View style={{ marginTop: space.xxl, gap: space.xs }}>
      <View style={[styles.head, { gap: space.sm }]}>
        <Text variant="label" color="ink2" accessibilityRole="header">{t('comments.title')}</Text>
        {count > 0 && <Text variant="label" color="ink3">{count}</Text>}
      </View>
      {comments.isPending ? (
        [70, 50].map((w) => <SkeletonRow key={w} width={w} />)
      ) : comments.error ? (
        <Notice>{errorMessage(comments.error)}</Notice>
      ) : (
        <>
          {comments.hasNextPage && (
            <View style={styles.start}>
              {loaded.length >= INLINE_MAX
                ? <Button variant="link" title={t('comments.seeAll', { count })} onPress={() => navigation.navigate('Comments', { taskId })} />
                : <Button variant="link" title={t('comments.earlier')} onPress={() => comments.fetchNextPage()} disabled={comments.isFetchingNextPage} />}
            </View>
          )}
          {!items.length && <Text variant="footnote" color="ink3">{t('comments.none')}</Text>}
          {/* At most 60 here, inside Task detail's scroll; more on their own screen. */}
          {items.map((c) => <CommentRow key={c.id} comment={c} lit={c.id === highlight} onPress={() => menu(c)} />)}
        </>
      )}
      {onAdd && (
        <Pressable onPress={onAdd} hitSlop={8} accessibilityRole="button" style={[styles.add, { gap: space.xs, marginTop: space.xs }]}>
          {({ pressed }) => (
            <>
              <Feather name="plus" size={16} color={pressed ? colors.accentPressed : colors.accent} />
              <Text variant="label" style={{ fontSize: 14, color: pressed ? colors.accentPressed : colors.accent }}>{t('comments.add')}</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

/**
 * A comment's menu: your own **Edit** (the comment page, `onEdit`), **Copy text**, **Delete**; someone else's **Copy
 * text**, and **Delete** for whoever manages the list. Deleting asks first.
 */
export function useCommentMenu(taskId: Id, onEdit?: (comment: Comment) => void) {
  const { t } = useTranslation();
  const { remove } = useCommentActions(taskId);
  return async (c: Comment) => {
    const actions = [
      ...(c.canEdit && onEdit ? [{ key: 'edit', label: t('comments.edit'), icon: 'edit-2' as const }] : []),
      { key: 'copy', label: t('comments.copy'), icon: 'copy' as const },
      ...(c.canDelete ? [{ key: 'delete', label: t('comments.delete'), icon: 'trash-2' as const, destructive: true }] : []),
    ];
    const i = await chooseAction({ title: c.canEdit ? t('comments.yours') : t('comments.theirs', { name: c.author.displayName }), actions, cancelLabel: t('common.cancel') });
    const action = i === null ? null : actions[i].key;
    if (action === 'edit') onEdit?.(c);
    if (action === 'copy') {
      await Clipboard.setStringAsync(plainText(c));
      useToast.getState().show({ message: t('comments.copied') });
    }
    if (action === 'delete') {
      const ok = await confirm({ title: t('comments.deleteTitle'), message: t('comments.deleteBody'), confirmLabel: t('comments.delete'), cancelLabel: t('common.cancel') });
      if (ok) remove.mutate(c.id, { onSuccess: () => useToast.getState().show({ message: t('comments.deleted') }), onError: toastError });
    }
  };
}

/** A comment: its author's face, "Name · time" (· edited) and the text, mentions as @Name in the accent. */
export function CommentRow({ comment: c, lit = false, onPress }: { comment: Comment; lit?: boolean; onPress(): void }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const me = useMe().data;
  const when = useWhen();
  const mine = c.author.id === me?.id;
  const name = mine ? t('comments.you') : c.author.displayName || t('notifications.someone');
  const meta = [when(c.createdAt), c.editedAt ? t('comments.edited') : ''].filter(Boolean).join(' · ');

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, ${meta}: ${plainText(c)}`}>
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.xs, marginHorizontal: -space.xs, backgroundColor: lit ? colors.accentSoft : pressed ? colors.surface2 : 'transparent' }]}>
          <Avatar name={c.author.displayName || '?'} seed={c.author.id} size={28} />
          <View style={styles.main}>
            <View style={[styles.head, { gap: space.sm }]}>
              <Text variant="bodyMedium" numberOfLines={1} style={styles.shrink}>{name}</Text>
              <Text variant="caption" color="ink3">{meta}</Text>
            </View>
            <Text variant="callout">
              {mentionParts(c).map((p, i) => (p.mention ? <Text key={i} variant="callout" color="accent" style={styles.at}>{p.text}</Text> : p.text))}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline' },
  start: { alignItems: 'flex-start' },
  add: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44 },
  row: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 10 },
  main: { flex: 1, minWidth: 0, gap: 2 },
  shrink: { flexShrink: 1 },
  at: { fontWeight: '600' },
});
