import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useUnreadCount } from '@/data/collaboration/queries';
import { Text, useTheme } from '@/shared/ui';

/** Home's bell beside the avatar (M74): the unread count as a badge (GET /notifications/unread-count); pushes Activity. */
export function ActivityBell() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const unread = useUnreadCount().data?.count ?? 0;
  return (
    <Pressable
      onPress={() => navigation.navigate('Activity')}
      accessibilityRole="button"
      accessibilityLabel={unread ? t('activity.openUnread', { count: unread }) : t('activity.title')}
      hitSlop={6}
      style={styles.button}
    >
      {({ pressed }) => (
        <View>
          <Feather name="bell" size={22} color={pressed ? colors.accentPressed : colors.accent} />
          {unread > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text variant="caption" style={{ color: colors.onAccent, fontSize: 10, lineHeight: 14 }}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -10, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
});
