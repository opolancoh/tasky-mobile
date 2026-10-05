import { Feather } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { nowIn } from '@/core/dates/localDate';
import type { ReminderChoice } from '@/core/dates/reminders';
import type { LocalDate } from '@/core/types';
import { useMe } from '@/data/tenancy/queries';
import { useCreateTask } from '@/data/tasks/mutations';
import { useCollections, useTags } from '@/data/tasks/queries';
import { taskLimits } from '@/data/tasks/types';
import { errorMessage } from '@/shared/i18n/errors';
import { useCurrentWorkspace } from '@/shared/session/useCurrentWorkspace';
import { removeTypedTag, typedTags as typedTagsOf } from '@/core/validation/tags';
import { CollectionIcon, CollectionPicker, DueDatePicker, ReminderPicker, sortByRecent, TagPicker, TagsRow, useRecentTags, type TagItem } from '@/shared/components';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { ClearButton, ListRow, Notice, Sheet, Text, useTheme, type SheetProps } from '@/shared/ui';

import { NotesPage } from './NotesPage';
import { QuickAddBar, type BarItem } from './QuickAddBar';
import { useQuickAdd } from './quickAddStore';

type Page = 'form' | 'collection' | 'tags' | 'due' | 'reminder' | 'notes';

interface Draft {
  title: string;
  notes: string;
  /** Undefined: the Inbox. */
  collectionId?: string;
  /** The Important flag (a bar icon toggles it, no page). */
  isImportant: boolean;
  dueDate?: LocalDate;
  reminder: ReminderChoice;
  /** Picked in the Tags page; sent as #name in the title, which the API applies (and creates when new). */
  tags: string[];
}

const EMPTY: Draft = { title: '', notes: '', isImportant: false, reminder: null, tags: [] };
const NO_NAMES: string[] = [];
/** The Inbox's mark before the collections arrive. */
const INBOX = { isInbox: true, color: '' };

/**
 * Quick add (06-mobile.md, M14, M15): the full form in a sheet, the same from every tab.
 * The form is a summary (Collection, then a row per set field, each with ✕) with a bottom icon bar (M18)
 * that sets them. The pickers, Reminder and Notes are pages inside the same sheet. Add creates the task (POST /tasks) and closes the sheet.
 */
export function QuickAddSheet() {
  const session = useQuickAdd((s) => s.session);
  return <QuickAddForm key={session} />;   // a new form (empty draft, no old error) every time it opens
}

function QuickAddForm() {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const open = useQuickAdd((s) => s.open);
  const hide = useQuickAdd((s) => s.hide);

  const workspace = useCurrentWorkspace();
  const me = useMe().data;
  const collectionsQuery = useCollections(workspace?.id);
  const tagsQuery = useTags(workspace?.id);
  const collections = collectionsQuery.data ?? [];
  const workspaceTags = tagsQuery.data ?? [];
  const recent = useRecentTags((s) => (workspace ? s.byWorkspace[workspace.id] : undefined)) ?? NO_NAMES;
  const create = useCreateTask(workspace?.id);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [page, setPage] = useState<Page>('form');
  const titleInput = useRef<TextInput>(null);
  const [beforePage, setBeforePage] = useState<Draft>(EMPTY);   // the draft when a page opened: tapping outside restores it
  const [now] = useState(() => (me ? nowIn(me.timeZone) : null));   // "now" for this Quick add, in the profile's zone

  const update = (changes: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...changes }));
    if (create.error) create.reset();
  };

  const today = now?.date;
  const inbox = collections.find((c) => c.isInbox);
  const collection = collections.find((c) => c.id === draft.collectionId) ?? inbox;
  const typedTags = typedTagsOf(draft.title);
  const tags = [...new Set([...draft.tags, ...typedTags])];
  const titleText = [...typedTags].reduce(removeTypedTag, draft.title).trim();
  const reminder = draft.reminder;
  const notesText = draft.notes.trim();
  // Never waits for the lists (M27): with none picked the task goes to the workspace's Inbox (POST with workspaceId).
  const canAdd = titleText.length > 0 && !!workspace && !create.isPending;

  const labels = useDateLabels(today);
  const dayText = labels.day;
  const reminderText = labels.reminder;
  const sortedTags = sortByRecent(workspaceTags, recent);
  const tagItems: TagItem[] = tags.map((n) => sortedTags.find((g) => g.name === n) ?? { name: n, color: null });

  function submit() {
    if (!canAdd || !workspace) return;
    const picked = draft.tags.filter((n) => !typedTags.includes(n)).map((n) => `#${n}`);
    const chosen = draft.reminder ?? undefined;
    create.mutate(
      {
        body: {
          ...(collection ? { collectionId: collection.id } : { workspaceId: workspace.id }),
          title: [draft.title.trim(), ...picked].join(' '),
          notes: draft.notes.trim() || undefined,
          isImportant: draft.isImportant || undefined,
          dueDate: draft.dueDate,
          reminderDate: chosen?.date,
          reminderTime: chosen?.time,
        },
        withoutReminder: !draft.reminder && !!draft.dueDate,
      },
      {
        onSuccess: () => {
          if (workspace) useRecentTags.getState().used(workspace.id, tags);
          hide();
        },
      },
    );
  }

  const toggleTag = (name: string) =>
    typedTags.includes(name)
      ? update({ title: removeTypedTag(draft.title, name), tags: draft.tags.filter((n) => n !== name) })
      : update({ tags: draft.tags.includes(name) ? draft.tags.filter((n) => n !== name) : [...draft.tags, name] });

  const clearTags = () => update({ title: typedTags.reduce(removeTypedTag, draft.title), tags: [] });

  const openPage = (next: Exclude<Page, 'form'>) => {
    Keyboard.dismiss();   // the keyboard only when typing (M30); Notes brings it back for its own field
    setBeforePage(draft);
    setPage(next);
  };
  /** Tapping outside a page: drop what changed on it (a quick choice has already returned to the form). */
  const discardPage = () => {
    setDraft(beforePage);
    setPage('form');
  };

  const pick = (changes: Partial<Draft>) => {
    update(changes);
    setPage('form');
  };

  const back = { icon: 'chevron-left' as const, label: t('quickAdd.task'), onPress: () => setPage('form') };
  const titles: Record<Exclude<Page, 'form'>, string> = {
    collection: t('quickAdd.fields.collection'),
    tags: t('quickAdd.fields.tags'),
    due: t('quickAdd.fields.dueDate'),
    reminder: t('quickAdd.fields.reminder'),
    notes: t('quickAdd.fields.notes'),
  };
  const header: Pick<SheetProps, 'title' | 'left' | 'right'> =
    page === 'form'
      ? { title: t('quickAdd.title'), left: { label: t('quickAdd.cancel'), onPress: hide }, right: { label: t('quickAdd.submit'), emphasis: true, disabled: !canAdd && !create.isPending, busy: create.isPending, onPress: submit } }
      : { title: titles[page], left: back };

  const barItems: BarItem[] = [
    { key: 'important', icon: 'flag', label: t('quickAdd.fields.important'), value: draft.isImportant ? t('quickAdd.on') : undefined, danger: true, onPress: () => update({ isImportant: !draft.isImportant }) },
    { key: 'due', icon: 'calendar', label: t('quickAdd.fields.dueDate'), value: draft.dueDate && dayText(draft.dueDate), onPress: () => openPage('due') },
    { key: 'reminder', icon: 'bell', label: t('quickAdd.fields.reminder'), value: reminder ? reminderText(reminder) : undefined, onPress: () => openPage('reminder') },
    { key: 'tags', icon: 'tag', label: t('quickAdd.fields.tags'), value: tags.length ? tags.join(', ') : undefined, onPress: () => openPage('tags') },
    { key: 'notes', icon: 'file-text', label: t('quickAdd.fields.notes'), value: notesText ? notesText.slice(0, 80) : undefined, onPress: () => openPage('notes') },
  ];

  return (
    // The form fits its rows (M29); its pages are the large size (M28).
    <Sheet visible={open} size={page === 'form' ? 'fit' : 'large'} onDismiss={page === 'form' ? hide : () => setPage('form')} onBackdropPress={page === 'form' ? hide : discardPage} dismissLabel={t('quickAdd.close')} {...header} footer={page === 'form' ? <View pointerEvents={create.isPending ? 'none' : 'auto'}><QuickAddBar items={barItems} /></View> : undefined}>
      {/* Full sheet width (a ScrollView clips its children), padded inside, so the divider reaches the edges. */}
      {page === 'form' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          pointerEvents={create.isPending ? 'none' : 'auto'}   // locked while Add saves
          bounces={false}
          style={[styles.summary, { marginHorizontal: -space.lg }]}
          contentContainerStyle={{ paddingHorizontal: space.lg }}
        >
          <View style={styles.titleRow}>
            <TextInput
            ref={titleInput}
            value={draft.title}
            onChangeText={(title) => update({ title })}
            placeholder={t('quickAdd.placeholder')}
            placeholderTextColor={colors.ink3}
            selectionColor={colors.accent}
            accessibilityLabel={t('quickAdd.fields.title')}
            multiline
            submitBehavior="blurAndSubmit"
            maxLength={taskLimits.titleMax}
            returnKeyType="done"
            style={[styles.title, { fontFamily: type.headline.fontFamily, fontSize: type.headline.fontSize, color: colors.heading }]}
            />
            {draft.title.length > 0 && (
              <ClearButton
                size={20}
                onPress={() => {
                  update({ title: '' });
                  titleInput.current?.focus();
                }}
                accessibilityLabel={t('quickAdd.clearTitle')}
                style={styles.clearTitle}
              />
            )}
          </View>
          {create.error && (
            <View style={{ marginBottom: space.md }}>
              <Notice>{errorMessage(create.error)}</Notice>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.line, marginHorizontal: -space.lg }]} />

          <View>
            <ListRow
              label={t('quickAdd.fields.collection')}
              icon={<CollectionIcon collection={collection ?? INBOX} />}
              value={<Text variant="bodyMedium" color="accent">{collection?.name ?? t('collections.inbox')}</Text>}
              onPress={() => openPage('collection')}
            />
            {draft.isImportant && (
              <ListRow
                label={t('quickAdd.fields.important')}
                icon={<Feather name="flag" size={20} color={colors.danger} />}
                strong
                onPress={() => update({ isImportant: false })}
                onClear={() => update({ isImportant: false })}
                clearLabel={t('quickAdd.clearImportant')}
              />
            )}
            {draft.dueDate && (
              <ListRow
                label={t('quickAdd.fields.dueDate')}
                icon={<Feather name="calendar" size={20} color={colors.accent} />}
                value={<Text variant="bodyMedium" color="accent">{dayText(draft.dueDate)}</Text>}
                onPress={() => openPage('due')}
                onClear={() => update({ dueDate: undefined })}
                clearLabel={t('quickAdd.clearDue')}
              />
            )}
            {reminder && (
              <ListRow
                label={t('quickAdd.fields.reminder')}
                icon={<Feather name="bell" size={20} color={colors.accent} />}
                value={
                  <View style={styles.end}>
                    <Text variant="bodyMedium" color="accent">{reminderText(reminder)}</Text>
                    <Text variant="caption" color="ink2">{t('reminders.onlyYou')}</Text>
                  </View>
                }
                onPress={() => openPage('reminder')}
                onClear={() => update({ reminder: null })}
                clearLabel={t('reminders.remove')}
              />
            )}
            {tags.length > 0 && <TagsRow tags={tagItems} onPress={() => openPage('tags')} onClear={clearTags} />}
            {notesText.length > 0 && (
              <ListRow
                label={t('quickAdd.fields.notes')}
                icon={<Feather name="file-text" size={20} color={colors.ink3} />}
                detail={notesText}
                onPress={() => openPage('notes')}
                onClear={() => update({ notes: '' })}
                clearLabel={t('quickAdd.clearNotes')}
                divider={false}
              />
            )}
          </View>
        </ScrollView>
      )}

      {page === 'collection' && <CollectionPicker collections={collections} loading={collectionsQuery.isPending} selectedId={collection?.id} onPick={(c) => pick({ collectionId: c.id })} />}

      {page === 'notes' && <NotesPage value={draft.notes} onChange={(notes) => update({ notes })} />}

      {page === 'tags' && <TagPicker tags={sortedTags} loading={tagsQuery.isPending} selected={tagItems} onToggle={toggleTag} />}

      {page === 'due' && today && (
        <DueDatePicker value={draft.dueDate} today={today} onPick={(dueDate) => pick({ dueDate })} onChange={(dueDate) => update({ dueDate })} />
      )}

      {page === 'reminder' && now && (
        <ReminderPicker
          value={reminder}
          onChange={(at) => update({ reminder: at })}
          onPick={(at) => pick({ reminder: at })}
          onRemove={() => pick({ reminder: null })}
          now={now}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // Font and size only on inputs: a lineHeight on an iOS TextInput clips descenders.
  title: { flex: 1, paddingTop: 8, paddingBottom: 16, paddingHorizontal: 0 },
  end: { alignItems: 'flex-end' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  /** ClearButton's negative vertical margin is for rows; the title keeps its own height. */
  clearTitle: { marginVertical: 0 },
  summary: { flexShrink: 1 },
  /** Full-width hairline under the title, like the one on top of the bar. */
  divider: { height: StyleSheet.hairlineWidth },
});
