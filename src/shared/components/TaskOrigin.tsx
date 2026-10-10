import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { CollectionRef, UserRef } from '@/data/tasks/types';
import { ColorDot, Text, useTheme } from '@/shared/ui';

/**
 * Where a task comes from, in a row's meta line: its list (color dot and name; "Inbox"), or, for a task the user sees only
 * as its assignee, who gave it ("From Olga", D70): they never see that list's name.
 */
export function TaskOrigin({ collection, assignedBy }: { collection: CollectionRef | null; assignedBy?: UserRef | null }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  return (
    <View style={[styles.row, { gap: space.xs }]}>
      {collection ? <ColorDot color={collection.color} size={8} /> : <Feather name="user" size={11} color={colors.ink3} />}
      <Text variant="footnote" color="ink3" numberOfLines={1} style={styles.shrink}>
        {collection
          ? collection.isInbox ? t('browse.inbox') : collection.name
          : t('taskRow.from', { name: assignedBy?.displayName.split(' ')[0] || t('notifications.someone') })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  shrink: { flexShrink: 1 },
});
