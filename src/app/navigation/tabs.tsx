import { Feather } from '@expo/vector-icons';
import type { BottomTabBarButtonProps, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import i18n from '@/shared/i18n/i18n';
import { Text, useTheme } from '@/shared/ui';

type IconName = ComponentProps<typeof Feather>['name'];

/**
 * The + in the middle of the tab bar (M11): 'filled' is option B in the prototype's Tab bar area,
 * 'plain' is option G. Either way it's 44 pt, inside the bar's height, with no label.
 */
const addButtonStyle: 'filled' | 'plain' = 'filled';

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

/** Draws the + in place of a tab. Its press goes through the tab's `tabPress` listener, which opens Quick add. */
function AddTabButton({ onPress, style }: BottomTabBarButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={i18n.t('quickAdd.add')} style={[style, styles.slot]}>
      {({ pressed }) =>
        addButtonStyle === 'filled' ? (
          <LinearGradient
            colors={colors.accentGradient as unknown as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.circle, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="plus" size={24} color={colors.onAccent} />
          </LinearGradient>
        ) : (
          <Feather name="plus-square" size={28} color={pressed ? colors.accentPressed : colors.accent} />
        )
      }
    </Pressable>
  );
}

/** The fake "Add" tab: never shows a screen; pressing it opens the QuickAdd sheet from the root stack. */
export const addTabOptions = (): BottomTabNavigationOptions => ({
  title: i18n.t('quickAdd.add'),
  tabBarButton: (props) => <AddTabButton {...props} />,
});

export const AddTabScreen = () => null;

const styles = StyleSheet.create({
  slot: { alignItems: 'center', justifyContent: 'center' },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
