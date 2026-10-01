import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { addDays, formatLocalDate, nextMonday, todayIn } from '@/core/dates/localDate';
import type { LocalDate } from '@/core/types';
import { useMe } from '@/data/tenancy/queries';
import { useCreateTask } from '@/data/tasks/mutations';
import { useCollections, useTags } from '@/data/tasks/queries';
import { taskLimits, type Priority } from '@/data/tasks/types';
import { errorMessage } from '@/shared/i18n/errors';
import { useCurrentWorkspace } from '@/shared/session/useCurrentWorkspace';
import { ListRow, Notice, Sheet, Text, useTheme, type SheetProps } from '@/shared/ui';

import { useQuickAdd } from './quickAddStore';

type Page = 'form' | 'collection' | 'priority' | 'due' | 'tags';

interface Draft {
  title: string;
  notes: string;
  /** Undefined: the Inbox. */
  collectionId?: string;
  priority: Priority;
  dueDate?: LocalDate;
  /** Picked in the Tags page; sent as #name in the title, which the API applies (and creates when new). */
  tags: string[];
}

const EMPTY: Draft = { title: '', notes: '', priority: 'none', tags: [] };
const PRIORITIES: Priority[] = ['high', 'medium', 'low', 'none'];
/** The API's #tag rule (TagNames.cs): a # at the start or after a space, then up to 50 characters without spaces or #. */
const TAG = /(?<=^|\s)#([^\s#]{1,50})(?=\s|$)/g;

/**
 * Quick add (06-mobile.md, M14): the full form in a sheet, the same from every tab.
 * Collection, Priority, Reminder, Due date, Tags, then Notes typed in place (plain text; a separate
 * notes editor comes with formatted notes, see pending-decisions.md). The pickers are pages inside the
 * same sheet. Add creates the task (POST /collections/{id}/tasks) and closes the sheet.
 */
export function QuickAddSheet() {
  const session = useQuickAdd((s) => s.session);
  return <QuickAddForm key={session} />;   // a new form (empty draft, no old error) every time it opens
}

function QuickAddForm() {
  const { t, i18n } = useTranslation();
  const { colors, space, type } = useTheme();
  const open = useQuickAdd((s) => s.open);
  const hide = useQuickAdd((s) => s.hide);

  const workspace = useCurrentWorkspace();
  const me = useMe().data;
  const collections = useCollections(workspace?.id).data ?? [];
  const workspaceTags = useTags(workspace?.id).data ?? [];
  const create = useCreateTask(workspace?.id);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [page, setPage] = useState<Page>('form');
  const [titleFocused, setTitleFocused] = useState(false);

  const update = (changes: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...changes }));
    if (create.error) create.reset();
  };

  const today = me ? todayIn(me.timeZone) : undefined;
  const inbox = collections.find((c) => c.isInbox);
  const collection = collections.find((c) => c.id === draft.collectionId) ?? inbox;
  const typedTags = [...draft.title.matchAll(TAG)].map((m) => m[1]!.toLowerCase());
  const tags = [...new Set([...draft.tags, ...typedTags])];
  const titleText = draft.title.replace(TAG, '').trim();
  const canAdd = titleText.length > 0 && !!collection && !create.isPending;

  const dueText = (date: LocalDate) =>
    date === today ? t('quickAdd.due.today')
    : today && date === addDays(today, 1) ? t('quickAdd.due.tomorrow')
    : formatLocalDate(date, i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });
  const priorityColor = (p: Priority) => ({ high: colors.danger, medium: colors.warn, low: colors.low, none: colors.ink3 })[p];

  function submit() {
    if (!canAdd || !collection) return;
    const picked = draft.tags.filter((n) => !typedTags.includes(n)).map((n) => `#${n}`);
    create.mutate(
      {
        collectionId: collection.id,
        body: {
          title: [draft.title.trim(), ...picked].join(' '),
          notes: draft.notes.trim() || undefined,
          priority: draft.priority,
          dueDate: draft.dueDate,
        },
      },
      { onSuccess: hide },
    );
  }

  const back = { icon: 'chevron-left' as const, label: t('quickAdd.task'), onPress: () => setPage('form') };
  const done = { label: t('quickAdd.done'), emphasis: true, onPress: () => setPage('form') };
  const header: Pick<SheetProps, 'title' | 'left' | 'right'> =
    page === 'form'
      ? { title: t('quickAdd.title'), left: { label: t('quickAdd.cancel'), onPress: hide }, right: { label: t('quickAdd.submit'), emphasis: true, disabled: !canAdd, onPress: submit } }
      : page === 'tags'
        ? { title: t('quickAdd.fields.tags'), left: back, right: done }
        : { title: t(`quickAdd.fields.${page === 'due' ? 'dueDate' : page}`), left: back };

  const pick = (changes: Partial<Draft>) => {
    update(changes);
    setPage('form');
  };

  return (
    <Sheet visible={open} onDismiss={hide} dismissLabel={t('quickAdd.close')} {...header}>
      {page === 'form' && (
        <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
          <TextInput
            value={draft.title}
            onChangeText={(title) => update({ title })}
            placeholder={t('quickAdd.placeholder')}
            placeholderTextColor={colors.ink3}
            selectionColor={colors.accent}
            accessibilityLabel={t('quickAdd.fields.title')}
            autoFocus
            maxLength={taskLimits.titleMax}
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            style={[styles.title, { fontFamily: type.body.fontFamily, color: colors.ink, borderBottomColor: titleFocused ? colors.accent : colors.fieldLine }]}
          />
          {create.error && (
            <View style={{ marginTop: space.md }}>
              <Notice>{errorMessage(create.error)}</Notice>
            </View>
          )}
          <View style={{ marginTop: space.sm }}>
            <ListRow
              label={t('quickAdd.fields.collection')}
              icon={<View style={[styles.dot, { backgroundColor: collection?.color ?? colors.ink3 }]} />}
              value={collection?.name ?? '…'}
              onPress={() => setPage('collection')}
            />
            <ListRow
              label={t('quickAdd.fields.priority')}
              icon={<Feather name="flag" size={20} color={priorityColor(draft.priority)} />}
              value={t(`quickAdd.priority.${draft.priority}`)}
              onPress={() => setPage('priority')}
            />
            <ListRow
              label={t('quickAdd.fields.reminder')}
              icon={<Feather name="bell" size={20} color={colors.ink3} />}
              value={
                draft.dueDate ? (
                  <View style={styles.end}>
                    <Text variant="body" color="ink2">{t('quickAdd.reminderAt', { date: dueText(draft.dueDate) })}</Text>
                    <Text variant="caption" color="ink3">{t('quickAdd.onlyYou')}</Text>
                  </View>
                ) : t('quickAdd.none')
              }
            />
            <ListRow
              label={t('quickAdd.fields.dueDate')}
              icon={<Feather name="calendar" size={20} color={colors.ink3} />}
              value={draft.dueDate ? <Text variant="body" color="accent">{dueText(draft.dueDate)}</Text> : t('quickAdd.none')}
              onPress={() => setPage('due')}
            />
            <ListRow
              label={t('quickAdd.fields.tags')}
              icon={<Feather name="tag" size={20} color={colors.ink3} />}
              value={tags.length ? tags.map((n) => `#${n}`).join(' ') : t('quickAdd.none')}
              onPress={() => setPage('tags')}
            />
            {/* Notes, typed in place under its label (plain text for now). */}
            <View style={[styles.notesRow, { gap: space.md, paddingVertical: space.sm }]}>
              <View style={styles.notesIcon}>
                <Feather name="align-left" size={20} color={colors.ink3} />
              </View>
              <View style={styles.notesMain}>
                <Text variant="body">{t('quickAdd.fields.notes')}</Text>
                <TextInput
                  value={draft.notes}
                  onChangeText={(notes) => update({ notes })}
                  placeholder={t('quickAdd.notesPlaceholder')}
                  placeholderTextColor={colors.ink3}
                  selectionColor={colors.accent}
                  accessibilityLabel={t('quickAdd.fields.notes')}
                  multiline
                  maxLength={taskLimits.notesMax}
                  textAlignVertical="top"
                  scrollEnabled
                  style={[styles.notes, { fontFamily: type.subhead.fontFamily, fontSize: type.subhead.fontSize, color: colors.ink2 }]}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {page === 'collection' && (
        <ScrollView>
          {collections.map((c, i) => (
            <ListRow
              key={c.id}
              label={c.name}
              icon={<View style={[styles.dot, { backgroundColor: c.color }]} />}
              selected={c.id === collection?.id}
              onPress={() => pick({ collectionId: c.id })}
              divider={i < collections.length - 1}
            />
          ))}
        </ScrollView>
      )}

      {page === 'priority' &&
        PRIORITIES.map((p, i) => (
          <ListRow
            key={p}
            label={t(`quickAdd.priority.${p}`)}
            icon={<Feather name="flag" size={20} color={priorityColor(p)} />}
            selected={p === draft.priority}
            onPress={() => pick({ priority: p })}
            divider={i < PRIORITIES.length - 1}
          />
        ))}

      {page === 'due' && today && (
        <>
          {[
            { label: t('quickAdd.due.today'), date: today },
            { label: t('quickAdd.due.tomorrow'), date: addDays(today, 1) },
            { label: t('quickAdd.due.nextWeek'), date: nextMonday(today) },
          ].map(({ label, date }) => (
            <ListRow
              key={label}
              label={label}
              value={formatLocalDate(date, i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })}
              selected={draft.dueDate === date}
              onPress={() => pick({ dueDate: date })}
            />
          ))}
          <ListRow label={t('quickAdd.due.none')} selected={!draft.dueDate} onPress={() => pick({ dueDate: undefined })} divider={false} />
        </>
      )}

      {page === 'tags' && (
        <ScrollView>
          {[...new Set([...workspaceTags.map((g) => g.name.toLowerCase()), ...tags])].map((name, i, all) => (
            <ListRow
              key={name}
              label={`#${name}`}
              selected={tags.includes(name)}
              onPress={() =>
                typedTags.includes(name)
                  ? update({ title: draft.title.replace(new RegExp(`(^|\\s)#${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'i'), '$1').replace(/\s+/g, ' ').trim(), tags: draft.tags.filter((n) => n !== name) })
                  : update({ tags: draft.tags.includes(name) ? draft.tags.filter((n) => n !== name) : [...draft.tags, name] })
              }
              divider={i < all.length - 1}
            />
          ))}
          <Text variant="footnote" color="ink3" style={{ marginTop: space.md }}>
            {t('quickAdd.tagsHint')}
          </Text>
        </ScrollView>
      )}

    </Sheet>
  );
}

const styles = StyleSheet.create({
  // Font and size only on inputs: a lineHeight on an iOS TextInput clips descenders.
  title: { fontSize: 18, paddingVertical: 12, paddingHorizontal: 2, borderBottomWidth: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  end: { alignItems: 'flex-end' },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start' },
  notesIcon: { width: 24, alignItems: 'center', paddingTop: 1 },
  notesMain: { flex: 1, gap: 2 },
  /** About five lines, then it scrolls; no lineHeight (it clips descenders on iOS). */
  notes: { minHeight: 22, maxHeight: 110, padding: 0 },
});
