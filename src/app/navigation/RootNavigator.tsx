import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStaticNavigation, type StaticParamList } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ForgotPasswordScreen } from '@/features/auth/ForgotPasswordScreen';
import { HomeScreen } from '@/features/home/HomeScreen';
import { NewPasswordScreen } from '@/features/auth/NewPasswordScreen';
import { ResetCodeScreen } from '@/features/auth/ResetCodeScreen';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { SignUpScreen } from '@/features/auth/SignUpScreen';
import { UnreachableScreen } from '@/features/auth/UnreachableScreen';
import { VerifyCodeScreen } from '@/features/auth/VerifyCodeScreen';
import { BrowseScreen } from '@/features/browse/BrowseScreen';
import { useQuickAdd } from '@/features/quick-add/quickAddStore';
import { SearchScreen } from '@/features/search/SearchScreen';
import { UpcomingScreen } from '@/features/upcoming/UpcomingScreen';
import i18n from '@/shared/i18n/i18n';
import { useIsSignedIn, useIsSignedOut, useIsUnreachable } from '@/shared/session/SessionProvider';

import { AddTabScreen, addTabOptions, tab, tabScreenOptions } from './tabs';

/** The signed-in home: stock bottom tabs with a + in the middle that opens Quick add (M11). */
const Tabs = createBottomTabNavigator({
  screenOptions: tabScreenOptions,
  screens: {
    Home: { screen: HomeScreen, options: tab('home', 'tabs.home') },
    Upcoming: { screen: UpcomingScreen, options: tab('calendar', 'tabs.upcoming') },
    Add: {
      screen: AddTabScreen,
      options: addTabOptions,
      listeners: {
        tabPress: (e) => {
          e.preventDefault();   // stay on the current tab; the sheet opens over it
          useQuickAdd.getState().show();
        },
      },
    },
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
    // A stored session the API can't confirm right now (offline, timeout, 5xx): kept, with Retry (M12).
    Unreachable: {
      if: useIsUnreachable,
      screens: { Unreachable: UnreachableScreen },
    },
    SignedIn: {
      if: useIsSignedIn,
      screens: {
        Tabs,
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
