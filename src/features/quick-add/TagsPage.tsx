import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListRow, SearchField, Text, useTheme } from '@/shared/ui';

import { newTagName, stripInvalidTagChars, TAG_NAME_MAX, type TagItem } from './tags';

interface TagsPageProps {
  /** The workspace's tags, already sorted (last used first). */
  tags: TagItem[];
  /** Picked names, including new ones the workspace doesn't have yet. */
  selected: TagItem[];
  onToggle(name: string): void;
}

/**
 * Tags, a page of the Quick add sheet: search or create, the picked tags, then all tags (last used
 * first). A new name is created by the API when the task is added (#name in the title); nothing is
 * created here.
 */
export function TagsPage({ tags, selected, onToggle }: TagsPageProps) {
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

  const dot = (color: string | null) => <View style={[styles.dot, { backgroundColor: color ?? colors.ink3 }]} />;
  const create = () => {
    if (!name || !canCreate) return;
    onToggle(name);
    setQuery('');
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
      <SearchField value={query} onChangeText={(text) => setQuery(stripInvalidTagChars(text))} onSubmit={create} maxLength={TAG_NAME_MAX} placeholder={t('quickAdd.tags.search')} clearLabel={t('quickAdd.tags.clearSearch')} />

      {canCreate && (
        <View style={{ marginTop: space.sm }}>
          <ListRow
            label={t('quickAdd.tags.create', { name })}
            icon={<Feather name="plus-circle" size={20} color={colors.accent} />}
            onPress={create}
            chevron={false}
            divider={false}
          />
        </View>
      )}

      {shownSelected.length > 0 && (
        <>
          <Header>{t('quickAdd.tags.selected', { count: selected.length })}</Header>
          {shownSelected.map((g, i) => (
            <ListRow key={g.name} label={g.name} strong icon={dot(g.color)} selected onPress={() => onToggle(g.name)} divider={i < shownSelected.length - 1} />
          ))}
        </>
      )}

      {shownAll.length > 0 && (
        <>
          <Header>{t('quickAdd.tags.all')}</Header>
          {shownAll.map((g, i) => (
            <ListRow key={g.name} label={g.name} icon={dot(g.color)} selected={false} onPress={() => onToggle(g.name)} divider={i < shownAll.length - 1} />
          ))}
        </>
      )}

      {!canCreate && shownSelected.length === 0 && shownAll.length === 0 && (
        <Text variant="footnote" color="ink3" style={{ marginTop: space.lg }}>
          {t(needle ? 'quickAdd.tags.noMatch' : 'quickAdd.tags.empty')}
        </Text>
      )}
    </ScrollView>
  );
}

function Header({ children }: { children: string }) {
  const { space } = useTheme();
  return (
    <Text variant="label" color="ink3" style={{ marginTop: space.xl, marginBottom: space.xs, letterSpacing: 0.6 }}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  dot: { width: 12, height: 12, borderRadius: 6 },
});
