import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStaticNavigation, getFocusedRouteNameFromRoute, type StaticParamList } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ForgotPasswordScreen } from '@/features/auth/ForgotPasswordScreen';
import { NewPasswordScreen } from '@/features/auth/NewPasswordScreen';
import { ResetCodeScreen } from '@/features/auth/ResetCodeScreen';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { SignUpScreen } from '@/features/auth/SignUpScreen';
import { UnreachableScreen } from '@/features/auth/UnreachableScreen';
import { VerifyCodeScreen } from '@/features/auth/VerifyCodeScreen';
import { ArchivedScreen } from '@/features/browse/ArchivedScreen';
import { BrowseListScreen } from '@/features/browse/BrowseListScreen';
import { BrowseScreen } from '@/features/browse/BrowseScreen';
import { CollectionScreen } from '@/features/browse/CollectionScreen';
import { PeopleScreen } from '@/features/browse/PeopleScreen';
import { RecentlyDeletedScreen } from '@/features/browse/RecentlyDeletedScreen';
import { TeamScreen } from '@/features/browse/TeamScreen';
import { useQuickAdd } from '@/features/quick-add/quickAddStore';
import { SearchScreen } from '@/features/search/SearchScreen';
import { InvitationScreen } from '@/features/sharing/InvitationScreen';
import { TodayListScreen } from '@/features/today/TodayListScreen';
import { TodayScreen } from '@/features/today/TodayScreen';
import { TaskDetailScreen } from '@/features/task/TaskDetailScreen';
import { UpcomingScreen } from '@/features/upcoming/UpcomingScreen';
import i18n from '@/shared/i18n/i18n';
import { useIsSignedIn, useIsSignedOut, useIsUnreachable } from '@/shared/session/SessionProvider';

import { AddTabScreen, addTabOptions, tab, tabScreenOptions } from './tabs';

/** The signed-in home: stock bottom tabs with a + in the middle that opens Quick add (M11). */
const Tabs = createBottomTabNavigator({
  screenOptions: tabScreenOptions,
  screens: {
    // The first tab is Today (M36): what is pending, at a glance.
    Today: { screen: TodayScreen, options: tab('check-circle', 'tabs.today') },
    Browse: { screen: BrowseScreen, options: tab('list', 'tabs.browse') },
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
    Upcoming: { screen: UpcomingScreen, options: tab('calendar', 'tabs.upcoming') },
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
        // Titled after the open tab, so a pushed screen's back button reads "‹ Today".
        Tabs: { screen: Tabs, options: ({ route }) => ({ title: i18n.t(`tabs.${(getFocusedRouteNameFromRoute(route) ?? 'Today').toLowerCase()}`) }) },
        TaskDetail: { screen: TaskDetailScreen, options: { headerShown: true }, linking: 'task/:taskId' },
        // See all, the chips and the shared line (M33); an invitation from Needs attention (M34).
        TodayList: { screen: TodayListScreen, options: { headerShown: true } },
        Invitation: { screen: InvitationScreen, options: { headerShown: true } },
        // Browse (M38): a list, a team, a list's or team's people, the other task lists, Archived, Recently Deleted.
        Collection: { screen: CollectionScreen, options: { headerShown: true } },
        Team: { screen: TeamScreen, options: { headerShown: true } },
        People: { screen: PeopleScreen, options: { headerShown: true } },
        BrowseList: { screen: BrowseListScreen, options: { headerShown: true } },
        Archived: { screen: ArchivedScreen, options: { headerShown: true } },
        RecentlyDeleted: { screen: RecentlyDeletedScreen, options: { headerShown: true } },
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
