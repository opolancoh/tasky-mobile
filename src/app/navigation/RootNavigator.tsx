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
import { ActivityScreen } from '@/features/activity/ActivityScreen';
import { CalendarScreen } from '@/features/calendar/CalendarScreen';
import { ArchivedScreen } from '@/features/browse/ArchivedScreen';
import { BrowseListScreen } from '@/features/browse/BrowseListScreen';
import { BrowseScreen } from '@/features/browse/BrowseScreen';
import { TaskListScreen } from '@/features/browse/TaskListScreen';
import { PeopleScreen } from '@/features/browse/PeopleScreen';
import { RecentlyDeletedScreen } from '@/features/browse/RecentlyDeletedScreen';
import { TeamScreen } from '@/features/browse/TeamScreen';
import { useQuickAdd } from '@/shared/quickAdd/quickAddStore';
import { SearchScreen } from '@/features/search/SearchScreen';
import { ErrorReportScreen } from '@/features/error-reports/ErrorReportScreen';
import { ErrorReportsScreen } from '@/features/error-reports/ErrorReportsScreen';
import { AboutScreen } from '@/features/me/AboutScreen';
import { NetworkLogEntryScreen } from '@/features/network-log/NetworkLogEntryScreen';
import { NetworkLogScreen } from '@/features/network-log/NetworkLogScreen';
import { ChangePasswordScreen } from '@/features/me/ChangePasswordScreen';
import { EditNameScreen } from '@/features/me/EditNameScreen';
import { AppearanceScreen } from '@/features/me/AppearanceScreen';
import { NotificationsScreen } from '@/features/me/NotificationsScreen';
import { LanguageScreen } from '@/features/me/LanguageScreen';
import { MeScreen } from '@/features/me/MeScreen';
import { SessionsScreen } from '@/features/me/SessionsScreen';
import { TimeZoneScreen } from '@/features/me/TimeZoneScreen';
import { InvitationScreen } from '@/features/sharing/InvitationScreen';
import { JoinPasteScreen } from '@/features/sharing/JoinPasteScreen';
import { JoinScreen } from '@/features/sharing/JoinScreen';
import { TodayListScreen } from '@/features/today/TodayListScreen';
import { TodayScreen } from '@/features/today/TodayScreen';
import { CommentsScreen } from '@/features/task/CommentsScreen';
import { HistoryScreen } from '@/features/task/HistoryScreen';
import { HoldScreen } from '@/features/task/HoldScreen';
import { TaskDetailScreen } from '@/features/task/TaskDetailScreen';
import i18n from '@/shared/i18n/i18n';
import { useIsSignedIn, useIsSignedOut, useIsUnreachable } from '@/shared/session/SessionProvider';

import { AddTabScreen, addTabOptions, tab, tabScreenOptions } from './tabs';

/** A tab route's key in tabs.*: the routes keep their names; Today is shown as Home (M65), Browse as Spaces (M70). */
const tabKey = (route: string) => (route === 'Today' ? 'home' : route === 'Browse' ? 'spaces' : route.toLowerCase());

/** The signed-in home: stock bottom tabs with a + in the middle that opens Quick add (M11). */
const Tabs = createBottomTabNavigator({
  screenOptions: tabScreenOptions,
  screens: {
    // The first tab is Home (M65): where the user lands and gets their bearings. The route keeps its name.
    Today: { screen: TodayScreen, options: tab('home', 'tabs.home') },
    // The second tab is Spaces (M70): everything the user can see. The route keeps its name.
    Browse: { screen: BrowseScreen, options: tab('grid', 'tabs.spaces') },
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
    // Calendar (M72, M74): every task by due date. Search last (M39); Activity is Home's bell, Me behind the avatar.
    Calendar: { screen: CalendarScreen, options: tab('calendar', 'tabs.calendar') },
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
        Tabs: { screen: Tabs, options: ({ route }) => ({ title: i18n.t(`tabs.${tabKey(getFocusedRouteNameFromRoute(route) ?? 'Today')}`) }) },
        TaskDetail: { screen: TaskDetailScreen, options: { headerShown: true }, linking: 'task/:taskId' },
        // On hold, the long way (M80): a reason, Until, who can resume it; or Resume with a new date.
        Hold: { screen: HoldScreen, options: { headerShown: true } },
        // Past 60 in Task detail (M83): every comment, or the whole history, on its own screen.
        Comments: { screen: CommentsScreen, options: { headerShown: true } },
        TaskHistory: { screen: HistoryScreen, options: { headerShown: true } },
        // See all and the cards (M33, M65); an invitation from Requests (M34).
        TodayList: { screen: TodayListScreen, options: { headerShown: true } },
        Invitation: { screen: InvitationScreen, options: { headerShown: true } },
        // Links into the app (D95, M84): what a link opens (from LinkWatcher or a paste), and pasting one.
        JoinLink: { screen: JoinScreen, options: { headerShown: true, presentation: 'modal' } },
        JoinPaste: { screen: JoinPasteScreen, options: { headerShown: true } },
        // Home's bell (M74).
        Activity: { screen: ActivityScreen, options: { headerShown: true } },
        // Browse (M38): a list, a team, a list's or team's people, the other task lists, Archived, Recently Deleted.
        TaskList: { screen: TaskListScreen, options: { headerShown: true } },
        Team: { screen: TeamScreen, options: { headerShown: true } },
        People: { screen: PeopleScreen, options: { headerShown: true } },
        BrowseList: { screen: BrowseListScreen, options: { headerShown: true } },
        Archived: { screen: ArchivedScreen, options: { headerShown: true } },
        RecentlyDeleted: { screen: RecentlyDeletedScreen, options: { headerShown: true } },
        Me: { screen: MeScreen, options: { headerShown: true } },
        // Settings (M41), from Me.
        EditName: { screen: EditNameScreen, options: { headerShown: true } },
        TimeZone: { screen: TimeZoneScreen, options: { headerShown: true } },
        Language: { screen: LanguageScreen, options: { headerShown: true } },
        Appearance: { screen: AppearanceScreen, options: { headerShown: true } },
        Notifications: { screen: NotificationsScreen, options: { headerShown: true } },
        ChangePassword: { screen: ChangePasswordScreen, options: { headerShown: true } },
        Sessions: { screen: SessionsScreen, options: { headerShown: true } },
        About: { screen: AboutScreen, options: { headerShown: true } },
        // Network log, from About (support and admin).
        NetworkLog: { screen: NetworkLogScreen, options: { headerShown: true } },
        NetworkLogEntry: { screen: NetworkLogEntryScreen, options: { headerShown: true } },
        // Error reports, from About (everyone while testing, M89).
        ErrorReports: { screen: ErrorReportsScreen, options: { headerShown: true } },
        ErrorReport: { screen: ErrorReportScreen, options: { headerShown: true } },
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
