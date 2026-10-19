import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useMarkRead } from '@/data/collaboration/mutations';
import type { Notification } from '@/data/collaboration/types';
import { useNotificationText } from '@/shared/hooks/useNotificationText';
import { Text, useTheme } from '@/shared/ui';

import { useActivityState, type ActivityGo } from './useActivityState';

/**
 * A notification (Today's Updates, Activity, M39): a dot while unread, its icon, one line and when. Three kinds (M58):
 * one that waits for the user has an accent label (Respond, Confirm) and opens where they answer; one with something to
 * see opens it (its task, list, team or people); one with nowhere to go doesn't react, only marks itself read.
 */
export function UpdateRow({ notification }: { notification: Notification }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const markRead = useMarkRead();
  const text = useNotificationText();
  const state = useActivityState(notification);
  const { line, when, icon } = text(notification);

  const go = (to: ActivityGo) => {
    if (to.to === 'invitation') navigation.navigate('Invitation', { invitationId: to.id });
    else if (to.to === 'task') navigation.navigate('TaskDetail', { taskId: to.id, commentId: to.commentId });
    else if (to.to === 'taskList') navigation.navigate('TaskList', { taskListId: to.id });
    else if (to.to === 'team') navigation.navigate('Team', { teamId: to.id });
    else navigation.navigate('People', to.of);
  };
  const press = () => {
    if (!notification.readAt) markRead.mutate([notification.id]);
    if (state) go(state.go);
  };
  const label = state?.needs ? t(`activity.${state.needs}`) : null;

  return (
    <Pressable
      onPress={press}
      accessibilityRole={state ? 'button' : undefined}
      accessibilityLabel={[line, label, when].filter(Boolean).join(', ')}
    >
      {({ pressed }) => (
        <View style={[styles.row, { gap: space.md, paddingVertical: space.sm + 2, borderBottomColor: colors.line, backgroundColor: pressed && state ? colors.surface2 : 'transparent' }]}>
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
          {label && <Text variant="label" color="accent">{label}</Text>}
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
