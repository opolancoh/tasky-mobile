import { Feather } from '@expo/vector-icons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';

import i18n from '@/shared/i18n/i18n';
import { Text, useTheme } from '@/shared/ui';

type IconName = ComponentProps<typeof Feather>['name'];

/** The active tab in accent, the others in ink3 (≥ 4.5:1 on the bar): icon and label both. */
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const { colors } = useTheme();
  return <Feather name={name} size={24} color={focused ? colors.accent : colors.ink3} />;
}

function TabLabel({ focused, children }: { focused: boolean; children: string }) {
  return (
    <Text variant="caption" color={focused ? 'accent' : 'ink3'} style={{ fontSize: 11 }}>
      {children}
    </Text>
  );
}

/** Stock bottom tab bar, Calm ocean: the screen's background, no top line. */
export const tabScreenOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarStyle: { borderTopWidth: 0, elevation: 0 },
  tabBarLabel: ({ focused, children }) => <TabLabel focused={focused}>{children}</TabLabel>,
};

/** One tab's title (label and accessibility name) and icon. */
export const tab = (icon: IconName, titleKey: string) => (): BottomTabNavigationOptions => ({
  title: i18n.t(titleKey),
  tabBarIcon: ({ focused }) => <TabIcon name={icon} focused={focused} />,
});
