import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { newTagName, stripInvalidTagChars, TAG_NAME_MAX } from '@/core/validation/tags';
import { ColorDot, ListRow, SearchField, SectionLabel, SkeletonRow, Text, useTheme } from '@/shared/ui';

import type { TagItem } from './tagItems';

interface TagPickerProps {
  /** The caller's tags, already sorted (last used first). */
  tags: TagItem[];
  /** Picked names, including new ones the caller doesn't have yet. */
  selected: TagItem[];
  onToggle(name: string): void;
  /** The tags are still loading: skeleton rows under the search box (M27). */
  loading?: boolean;
}

/**
 * Picks a task's tags (Quick add's Tags page, task detail): search or create, the picked tags, then all
 * tags (last used first). A new name is created by the API when the task is saved (#name in the title);
 * nothing is created here.
 */
export function TagPicker({ tags, selected, onToggle, loading }: TagPickerProps) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const [query, setQuery] = useState('');
  const needle = query.trim().replace(/^#/, '').toLowerCase();
  const matches = (g: TagItem) => g.name.includes(needle);

  const pickedNames = new Set(selected.map((g) => g.name));
  const shownSelected = selected.filter(matches);
  const shownAll = tags.filter((g) => !pickedNames.has(g.name) && matches(g));
  const name = newTagName(query);
  const canCreate = !!name && !tags.some((g) => g.name === name) && !pickedNames.has(name);

  const dot = (color: string | null) => <ColorDot color={color} />;
  const create = () => {
    if (!name || !canCreate) return;
    onToggle(name);
    setQuery('');
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
      <SearchField value={query} onChangeText={(text) => setQuery(stripInvalidTagChars(text))} onSubmit={create} maxLength={TAG_NAME_MAX} placeholder={t('tags.search')} clearLabel={t('tags.clearSearch')} />

      {canCreate && (
        <View style={{ marginTop: space.sm }}>
          <ListRow
            label={t('tags.create', { name })}
            icon={<Feather name="plus-circle" size={20} color={colors.accent} />}
            onPress={create}
            chevron={false}
            divider={false}
          />
        </View>
      )}

      {shownSelected.length > 0 && (
        <>
          <SectionLabel>{t('tags.selected', { count: selected.length })}</SectionLabel>
          {shownSelected.map((g, i) => (
            <ListRow key={g.name} label={g.name} strong icon={dot(g.color)} selected onPress={() => onToggle(g.name)} divider={i < shownSelected.length - 1} />
          ))}
        </>
      )}

      {shownAll.length > 0 && (
        <>
          <SectionLabel>{t('tags.all')}</SectionLabel>
          {shownAll.map((g, i) => (
            <ListRow key={g.name} label={g.name} icon={dot(g.color)} selected={false} onPress={() => onToggle(g.name)} divider={i < shownAll.length - 1} />
          ))}
        </>
      )}

      {loading && [55, 40, 65].map((w) => <SkeletonRow key={w} width={w} />)}

      {!loading && !canCreate && shownSelected.length === 0 && shownAll.length === 0 && (
        <Text variant="footnote" color="ink3" style={{ marginTop: space.lg }}>
          {t(needle ? 'tags.noMatch' : 'tags.empty')}
        </Text>
      )}
    </ScrollView>
  );
}
