import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ClearButton, ColorDot, Text, useTheme } from '@/shared/ui';

import type { TagItem } from './tagItems';

/**
 * A form's Tags row (Quick add, task detail): the tag icon, the picked tags as chips (tinted with each tag's color, wrapping
 * onto more lines), a ✕ that clears them (a chevron when none). "None" when empty.
 */
export function TagsRow({ tags, onPress, onClear, divider = true }: { tags: TagItem[]; onPress(): void; onClear?(): void; divider?: boolean }) {
  const { t } = useTranslation();
  const { colors, radius, space } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${t('tags.title')}: ${tags.length ? tags.map((g) => g.name).join(', ') : t('tags.none')}`}>
      {({ pressed }) => (
        <View
          style={[
            styles.row,
            { gap: space.md, paddingVertical: space.sm, backgroundColor: pressed ? colors.surface2 : 'transparent' },
            divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
          ]}
        >
          <View style={styles.icon}>
            <Feather name="tag" size={20} color={tags.length ? colors.accent : colors.ink3} />
          </View>
          <View style={[styles.main, { gap: space.sm }]}>
            {tags.length ? (
              tags.map((g) => (
                <View key={g.name} style={[styles.chip, { backgroundColor: `${g.color ?? colors.ink3}26`, borderRadius: radius.pill, gap: space.xs + 2 }]}>
                  <ColorDot color={g.color} size={8} />
                  <Text variant="subhead" color="ink" numberOfLines={1} style={styles.name}>
                    {g.name}
                  </Text>
                </View>
              ))
            ) : (
              <Text variant="body">{t('tags.title')}</Text>
            )}
          </View>
          {tags.length === 0 && <Text variant="body" color="ink2">{t('tags.none')}</Text>}
          {onClear ? (
            <ClearButton onPress={onClear} accessibilityLabel={t('tags.clear')} />
          ) : (
            <Feather name="chevron-right" size={18} color={colors.ink3} style={styles.trailing} />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  icon: { width: 24, alignItems: 'center' },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, maxWidth: '100%' },
  name: { flexShrink: 1 },
  trailing: { width: 20, textAlign: 'center' },
});
