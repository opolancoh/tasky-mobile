import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Text, useTheme } from '@/shared/ui';

/** A list's Completed heading (M63, M105): a tap folds or unfolds it; the count beside it when known. */
export function CompletedHeading({ folded, count, onPress }: { folded: boolean; count?: number; onPress(): void }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: !folded }} style={[styles.head, { gap: space.xs, marginTop: space.lg }]}>
      <Feather name="chevron-right" size={16} color={colors.ink2} style={!folded && styles.turned} />
      <Text variant="label" color="ink2">{t('browse.completed')}</Text>
      {count !== undefined && <Text variant="label" color="ink3">{count}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  turned: { transform: [{ rotate: '90deg' }] },
});
