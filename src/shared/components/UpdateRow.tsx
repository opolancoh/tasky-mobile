import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useMarkRead } from '@/data/collaboration/mutations';
import type { Notification } from '@/data/collaboration/types';
import { useNotificationText } from '@/shared/hooks/useNotificationText';
import { Text, useTheme } from '@/shared/ui';

/**
 * A notification (Today's Updates, Activity, M39): a dot while unread, its icon, one line and when. Opening it marks it
 * read and goes to its task (or Browse for a list or team).
 */
export function UpdateRow({ notification }: { notification: Notification }) {
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const markRead = useMarkRead();
  const text = useNotificationText();
  const { line, when, icon } = text(notification);
  const open = () => {
    if (!notification.readAt) markRead.mutate([notification.id]);
    if (notification.taskId) navigation.navigate('TaskDetail', { taskId: notification.taskId });
    else navigation.navigate('Tabs', { screen: 'Browse' });
  };
  return (
    <Pressable onPress={open} accessibilityRole="button">
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.sm + 2, borderBottomColor: colors.line, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}>
          <View style={[styles.lead, { gap: space.sm }]}>
            <View style={[styles.dot, { backgroundColor: notification.readAt ? 'transparent' : colors.unreadDot }]} />
            <View style={[styles.badge, { backgroundColor: colors.surface2 }]}>
              <Feather name={icon} size={16} color={colors.ink2} />
            </View>
          </View>
          <View style={styles.main}>
            <Text variant="bodyMedium" numberOfLines={1}>{line}</Text>
            <Text variant="footnote" color="ink3" numberOfLines={1}>{when}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  lead: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badge: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, minWidth: 0, gap: 2 },
});
