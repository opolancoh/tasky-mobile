import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStaticNavigation, type StaticParamList } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ForgotPasswordScreen } from '@/features/auth/ForgotPasswordScreen';
import { NewPasswordScreen } from '@/features/auth/NewPasswordScreen';
import { ResetCodeScreen } from '@/features/auth/ResetCodeScreen';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { SignUpScreen } from '@/features/auth/SignUpScreen';
import { VerifyCodeScreen } from '@/features/auth/VerifyCodeScreen';
import { BrowseScreen } from '@/features/browse/BrowseScreen';
import { QuickAddSheet } from '@/features/quick-add/QuickAddSheet';
import { SearchScreen } from '@/features/search/SearchScreen';
import { TodayScreen } from '@/features/today/TodayScreen';
import { UpcomingScreen } from '@/features/upcoming/UpcomingScreen';
import i18n from '@/shared/i18n/i18n';
import { useIsSignedIn, useIsSignedOut } from '@/shared/session/SessionProvider';

import { tab, tabScreenOptions } from './tabs';

/** The signed-in home: stock bottom tabs; the list tabs show an "Add a task" row above the bar (M11). */
const Tabs = createBottomTabNavigator({
  screenOptions: tabScreenOptions,
  screens: {
    Today: { screen: TodayScreen, options: tab('sun', 'tabs.today') },
    Upcoming: { screen: UpcomingScreen, options: tab('calendar', 'tabs.upcoming') },
    Browse: { screen: BrowseScreen, options: tab('list', 'tabs.browse') },
    Search: { screen: SearchScreen, options: tab('search', 'tabs.search') },
  },
});

/**
 * One stack, two groups picked by the session (06-mobile.md, Navigation). Signing in or out swaps
 * the group, and the other group's history goes with it.
 */
const RootStack = createNativeStackNavigator({
  // Pushed screens show a plain native header: back button in the accent color, no title, no line.
  screenOptions: { headerShown: false, title: '', headerShadowVisible: false },
  groups: {
    SignedOut: {
      if: useIsSignedOut,
      screens: {
        SignIn: SignInScreen,
        SignUp: { screen: SignUpScreen, options: () => ({ headerShown: true, headerBackTitle: i18n.t('auth.signIn.title') }) },
        VerifyCode: { screen: VerifyCodeScreen, options: () => ({ headerShown: true, headerBackTitle: i18n.t('common.back') }) },
        ForgotPassword: { screen: ForgotPasswordScreen, options: () => ({ headerShown: true, headerBackTitle: i18n.t('auth.signIn.title') }) },
        ResetCode: { screen: ResetCodeScreen, options: () => ({ headerShown: true, headerBackTitle: i18n.t('common.back') }) },
        NewPassword: { screen: NewPasswordScreen, options: () => ({ headerShown: true, headerBackTitle: i18n.t('common.back') }) },
      },
    },
    SignedIn: {
      if: useIsSignedIn,
      screens: {
        Tabs,
        QuickAdd: { screen: QuickAddSheet, options: { presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true } },
      },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);

export type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
