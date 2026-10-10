import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { byName } from '@/core/text/collate';
import type { Id } from '@/core/types';
import { limits } from '@/core/validation/limits';
import { newTagName, stripInvalidTagChars, TAG_NAME_MAX } from '@/core/validation/tags';
import { tasksApi } from '@/data/tasks/api';
import { useCreateCollection, useCreateTeam, useRenameTag, useRenameTeam, useSaveTag, useUpdateCollection } from '@/data/tasks/mutations';
import { useCollections, useTags, useTeams } from '@/data/tasks/queries';
import type { SortMode } from '@/data/tasks/types';
import { taskLimits } from '@/data/tasks/types';
import { errorMessage } from '@/shared/i18n/errors';
import { collectionColors, confirm, ListRow, Notice, SectionLabel, Sheet, Text, TextField, useTheme, useToast } from '@/shared/ui';

import { useBrowseSheet, type BrowseSheetTarget } from './browseSheetStore';

const SORTS: SortMode[] = ['manual', 'dueDate', 'important', 'alphabetical', 'created'];

/**
 * Browse's sheets (M38, large size, M28): New list and Edit list (name, color, where for a new one, sort), New team
 * and Rename team, Edit tag (name, the user's own color). A draft saved with Create or Save; Cancel with changes asks
 * first (M26). Mounted once in App; `useBrowseSheet` says what it edits.
 */
export function BrowseSheet() {
  const session = useBrowseSheet((s) => s.session);
  const target = useBrowseSheet((s) => s.target);
  return target ? <Editor key={session} target={target} /> : null;   // each opening starts from the saved values
}

function Editor({ target }: { target: BrowseSheetTarget }) {
  const { t } = useTranslation();
  const open = useBrowseSheet((s) => s.open);
  const hide = useBrowseSheet((s) => s.hide);
  const onCreated = useBrowseSheet((s) => s.onCreated);
  const collections = useCollections().data ?? [];
  const teams = useTeams().data ?? [];
  const tags = useTags().data ?? [];

  const list = target.kind === 'list' && target.id ? collections.find((c) => c.id === target.id) : undefined;
  const team = target.kind === 'team' && target.id ? teams.find((x) => x.id === target.id) : undefined;
  const tag = target.kind === 'tag' ? tags.find((x) => x.name === target.name) : undefined;
  const used = new Set(collections.map((c) => c.color));
  const [initial] = useState(() => ({
    name: list?.name ?? team?.name ?? tag?.name ?? '',
    color: list?.color ?? tag?.color ?? (target.kind === 'list' ? (collectionColors.find((c) => !used.has(c)) ?? collectionColors[0]) : null),
    sort: list?.sortMode ?? ('manual' as SortMode),
    teamId: target.kind === 'list' ? target.teamId : undefined,
  }));
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState<string | null>(initial.color);
  const [sort, setSort] = useState<SortMode>(initial.sort);
  const [teamId, setTeamId] = useState<Id | undefined>(initial.teamId);

  const createList = useCreateCollection();
  const updateList = useUpdateCollection();
  const createTeam = useCreateTeam();
  const renameTeam = useRenameTeam();
  const saveTag = useSaveTag();
  const renameTag = useRenameTag();
  const busy = createList.isPending || updateList.isPending || createTeam.isPending || renameTeam.isPending || saveTag.isPending || renameTag.isPending;
  const error = createList.error ?? updateList.error ?? createTeam.error ?? renameTeam.error ?? saveTag.error ?? renameTag.error;

  const isNew = target.kind === 'list' ? !target.id : target.kind === 'team' ? !target.id : false;
  const inbox = !!list?.isInbox;
  const trimmed = name.trim();
  const tagName = target.kind === 'tag' ? newTagName(name) : undefined;
  const dirty = name !== initial.name || color !== initial.color || sort !== initial.sort || teamId !== initial.teamId;
  const valid = target.kind === 'tag' ? !!tagName : inbox || trimmed.length > 0;

  const title = target.kind === 'tag' ? t('browse.sheet.tag')
    : target.kind === 'team' ? t(isNew ? 'browse.newTeam' : 'browse.sheet.team')
    : inbox ? t('browse.inbox') : t(isNew ? 'browse.newList' : 'browse.sheet.list');

  const done = (message?: string) => {
    hide();
    if (message) useToast.getState().show({ message });
  };

  const save = async () => {
    if (!valid || busy) return;
    if (target.kind === 'list') {
      if (list) {
        updateList.mutate(
          { collection: list, body: { ...(inbox || trimmed === list.name ? {} : { name: trimmed }), ...(inbox || color === list.color ? {} : { color: color! }), ...(sort === list.sortMode ? {} : { sortMode: sort }) } },
          { onSuccess: () => done(t('browse.saved')) },
        );
      } else {
        createList.mutate({ name: trimmed, color: color!, teamId }, {
          onSuccess: (created) => { done(t('browse.created', { name: trimmed })); onCreated?.(created.id); },
        });
      }
    } else if (target.kind === 'team') {
      if (team) renameTeam.mutate({ team, name: trimmed }, { onSuccess: () => done(t('browse.saved')) });
      else createTeam.mutate(trimmed, { onSuccess: (created) => { done(t('browse.teamCreated', { name: trimmed })); onCreated?.(created.id); } });
    } else {
      const from = target.name, to = tagName!;
      if (to !== from) {
        // Rename or merge (a name in use): ask first when other people's tasks change too (product: Tag rules 6).
        const merge = tags.some((x) => x.name === to);
        const preview = await (merge ? tasksApi.mergeTag(from, to, true) : tasksApi.renameTag(from, to, true)).catch(() => undefined);
        const shared = preview?.sharedTasks ?? 0;
        if (merge || shared) {
          const ok = await confirm({
            title: t(merge ? 'browse.mergeTitle' : 'browse.renameTitle', { from, to }),
            message: [merge && t('browse.mergeBody', { from, to }), shared > 0 && t('browse.alsoShared', { count: shared })].filter(Boolean).join(' '),
            confirmLabel: t(merge ? 'browse.merge' : 'browse.rename'),
            cancelLabel: t('common.cancel'),
            destructive: false,
          });
          if (!ok) return;
        }
        renameTag.mutate({ name: from, to, merge }, {
          onSuccess: () => (color !== initial.color ? saveTag.mutate({ name: to, color }, { onSuccess: () => done(t('browse.saved')) }) : done(t('browse.saved'))),
        });
      } else saveTag.mutate({ name: from, color }, { onSuccess: () => done(t('browse.saved')) });
    }
  };

  const cancel = async () => {
    if (dirty && !isNew) {
      const ok = await confirm({ title: t('browse.discardTitle'), message: t('browse.discardBody'), confirmLabel: t('browse.discard'), cancelLabel: t('browse.keepEditing') });
      if (!ok) return;
    }
    hide();
  };

  return (
    <Sheet
      visible={open}
      onDismiss={cancel}
      dismissLabel={t('common.close')}
      title={title}
      left={{ label: t('common.cancel'), onPress: cancel }}
      right={{ label: t(isNew ? 'browse.create' : 'common.save'), onPress: save, emphasis: true, disabled: !valid || (!isNew && !dirty), busy }}
    >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {error && <View style={styles.gap}><Notice>{errorMessage(error)}</Notice></View>}
        {!inbox && (
          <TextField
            label={t('browse.sheet.name')}
            value={name}
            onChangeText={(v) => setName(target.kind === 'tag' ? stripInvalidTagChars(v.replace(/\s/g, '-')).toLowerCase() : v)}
            placeholder={t(target.kind === 'tag' ? 'browse.sheet.tagPlaceholder' : target.kind === 'team' ? 'browse.sheet.teamPlaceholder' : 'browse.sheet.listPlaceholder')}
            maxLength={target.kind === 'tag' ? TAG_NAME_MAX : target.kind === 'team' ? limits.teamNameMax : taskLimits.collectionNameMax}
            autoCapitalize={target.kind === 'tag' ? 'none' : 'sentences'}
            autoCorrect={target.kind !== 'tag'}
            hint={target.kind === 'tag' ? t('browse.sheet.tagHint') : target.kind === 'team' ? t('browse.sheet.teamHint') : undefined}
          />
        )}
        {target.kind !== 'team' && !inbox && <Swatches value={color} onChange={setColor} allowNone={target.kind === 'tag'} />}
        {target.kind === 'list' && isNew && teams.length > 0 && (
          <>
            <SectionLabel>{t('browse.sheet.in')}</SectionLabel>
            <ListRow label={t('browse.myLists')} detail={t('browse.sheet.privateHint')} selected={!teamId} onPress={() => setTeamId(undefined)} />
            {[...teams].sort(byName).map((x, i, all) => (
              <ListRow key={x.id} label={x.name} detail={t('browse.sheet.teamListHint', { name: x.name })} selected={teamId === x.id} onPress={() => setTeamId(x.id)} divider={i < all.length - 1} />
            ))}
          </>
        )}
        {target.kind === 'list' && (
          <>
            <SectionLabel>{t('browse.sheet.sortBy')}</SectionLabel>
            {SORTS.map((s, i) => <ListRow key={s} label={t(`browse.sort.${s}`)} selected={sort === s} onPress={() => setSort(s)} divider={i < SORTS.length - 1} />)}
            {list && list.sharing !== 'private' && <Text variant="footnote" color="ink3" style={styles.gap}>{t('browse.sheet.sameForAll')}</Text>}
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

/** The color swatches (user data, collectionColors); tags may have none (gray). */
function Swatches({ value, onChange, allowNone }: { value: string | null; onChange(color: string | null): void; allowNone: boolean }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const options: (string | null)[] = allowNone ? [null, ...collectionColors] : [...collectionColors];
  return (
    <>
      <SectionLabel>{t('browse.sheet.color')}</SectionLabel>
      <View style={[styles.swatches, { gap: space.xs }]} accessibilityRole="radiogroup">
        {options.map((c) => {
          const on = c === value;
          return (
            <Pressable key={c ?? 'none'} onPress={() => onChange(c)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={c ?? t('browse.sheet.noColor')} style={styles.swatch}>
              <View style={[styles.ring, { borderColor: on ? colors.ink : 'transparent' }]}>
                <View style={[styles.dot, { backgroundColor: c ?? colors.tagDefault }]}>{!c && <Feather name="slash" size={16} color={colors.surface} />}</View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  gap: { marginVertical: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap' },
  swatch: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
