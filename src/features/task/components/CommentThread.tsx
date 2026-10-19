import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { addDays, formatInstant, todayIn } from '@/core/dates/localDate';
import type { Id } from '@/core/types';
import { useCommentActions } from '@/data/tasks/mutations';
import { useComments } from '@/data/tasks/queries';
import type { Comment } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { Avatar } from '@/shared/components';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { errorMessage, toastError } from '@/shared/i18n/errors';
import { Button, chooseAction, confirm, Notice, SkeletonRow, Text, useTheme, useToast } from '@/shared/ui';

import { mentionParts, plainText } from './mentions';

/**
 * A task's comments (D92, M82, the hub's A's): at the end of Task detail, newest last, the latest 20 and **Show earlier**.
 * A comment is a row with a face, "Name · time" (· edited) and the text, mentions in the accent. A tap opens its menu:
 * your own **Edit**, **Copy text**, **Delete**; someone else's **Copy text**, and **Delete** for whoever manages the list.
 * Deleting asks first. `highlight`: the comment a notification opened (tinted), `onHighlight` once it's on screen.
 */
export function CommentThread({ taskId, count, highlight, onHighlight, onEdit }: { taskId: Id; count: number; highlight?: Id; onHighlight(): void; onEdit(comment: Comment): void }) {
  const { t } = useTranslation();
  const { space } = useTheme();
  const comments = useComments(taskId);
  const { remove } = useCommentActions(taskId);
  const items = [...(comments.data?.pages.flatMap((p) => p.items) ?? [])].reverse();   // the API sends newest first
  const shown = useRef(false);
  const found = !!highlight && items.some((c) => c.id === highlight);
  useEffect(() => {
    if (found && !shown.current) {
      shown.current = true;
      onHighlight();
    }
  }, [found, onHighlight]);

  const menu = async (c: Comment) => {
    const actions = [
      ...(c.canEdit ? [{ key: 'edit', label: t('comments.edit'), icon: 'edit-2' as const }] : []),
      { key: 'copy', label: t('comments.copy'), icon: 'copy' as const },
      ...(c.canDelete ? [{ key: 'delete', label: t('comments.delete'), icon: 'trash-2' as const, destructive: true }] : []),
    ];
    const i = await chooseAction({ title: c.canEdit ? t('comments.yours') : t('comments.theirs', { name: c.author.displayName }), actions, cancelLabel: t('common.cancel') });
    const action = i === null ? null : actions[i].key;
    if (action === 'edit') onEdit(c);
    if (action === 'copy') {
      await Clipboard.setStringAsync(plainText(c));
      useToast.getState().show({ message: t('comments.copied') });
    }
    if (action === 'delete') {
      const ok = await confirm({ title: t('comments.deleteTitle'), message: t('comments.deleteBody'), confirmLabel: t('comments.delete'), cancelLabel: t('common.cancel') });
      if (ok) remove.mutate(c.id, { onSuccess: () => useToast.getState().show({ message: t('comments.deleted') }), onError: toastError });
    }
  };

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
              <Button variant="link" title={t('comments.earlier')} onPress={() => comments.fetchNextPage()} disabled={comments.isFetchingNextPage} />
            </View>
          )}
          {!items.length && <Text variant="footnote" color="ink3">{t('comments.none')}</Text>}
          {/* At most 20 more per tap, inside Task detail's scroll: not a FlashList. */}
          {items.map((c) => <CommentRow key={c.id} comment={c} lit={c.id === highlight} onPress={() => menu(c)} />)}
        </>
      )}
    </View>
  );
}

function CommentRow({ comment: c, lit, onPress }: { comment: Comment; lit: boolean; onPress(): void }) {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const labels = useDateLabels(today);
  const mine = c.author.id === me?.id;
  const name = mine ? t('comments.you') : c.author.displayName || t('notifications.someone');

  let when = '';
  if (me) {
    const day = formatInstant(c.createdAt, 'en-CA', me.timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' });   // YYYY-MM-DD in the profile's zone
    const time = formatInstant(c.createdAt, i18n.language, me.timeZone, { hour: 'numeric', minute: '2-digit' });
    when = day === today ? time : today && day === addDays(today, -1) ? `${t('dates.yesterday')}, ${time}` : `${labels.day(day)}, ${time}`;
  }
  const meta = [when, c.editedAt ? t('comments.edited') : ''].filter(Boolean).join(' · ');

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
  row: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 10 },
  main: { flex: 1, minWidth: 0, gap: 2 },
  shrink: { flexShrink: 1 },
  at: { fontWeight: '600' },
});
