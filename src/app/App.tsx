import '@/shared/i18n/i18n';

import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UpdateRequiredScreen } from '@/features/auth/UpdateRequiredScreen';
import { BrowseSheet } from '@/features/browse/BrowseSheet';
import { QuickAddSheet } from '@/features/quick-add/QuickAddSheet';
import { BulkSheet } from '@/shared/selection/BulkSheet';
import { TaskFieldSheet } from '@/features/task/TaskFieldSheet';
import { NetworkLogAccess } from '@/shared/network/NetworkLogAccess';
import { NotificationAskSheet } from '@/shared/notifications/NotificationAskSheet';
import { ReminderSync } from '@/shared/notifications/useReminders';
import { SessionProvider, useSession } from '@/shared/session/SessionProvider';
import { useSessionStore } from '@/shared/session/sessionStore';
import { ActionSheetHost, fonts, ThemeProvider, ToastHost, useAppearanceHydrated, useTheme } from '@/shared/ui';

import { parseJoinLink } from '@/core/links';

import { LinkWatcher, navigationRef } from './LinkWatcher';
import { PushWatcher } from './PushWatcher';
import { Navigation } from './navigation/RootNavigator';
import { queryClient } from './queryClient';
import { tokenManager } from './services';

SplashScreen.preventAutoHideAsync();

export function App() {
  return (
    // Gestures (swipe a step to delete it) need the root view.
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider tokens={tokenManager}>
              <Root />
            </SessionProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Keeps the splash screen up until fonts are loaded, the stored session is checked and Appearance is read (M68). */
function Root() {
  const [fontsLoaded] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold });
  const { status } = useSession();
  const updateRequired = useSessionStore((s) => s.updateRequired);
  const { colors, scheme } = useTheme();
  const appearanceRead = useAppearanceHydrated();
  const ready = fontsLoaded && status !== 'loading' && appearanceRead;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: colors.accent, background: colors.bg, card: colors.bg, text: colors.ink, border: colors.line, notification: colors.danger },
      fonts: {
        regular: { fontFamily: fonts.regular, fontWeight: '400' },
        medium: { fontFamily: fonts.medium, fontWeight: '500' },
        bold: { fontFamily: fonts.semibold, fontWeight: '600' },
        heavy: { fontFamily: fonts.bold, fontWeight: '700' },
      },
    };
  }, [scheme, colors]);

  if (!ready) return null;
  // A 426 (M48): nothing else works until the app is updated.
  if (updateRequired) return <UpdateRequiredScreen />;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Join links (D95) are LinkWatcher's: it keeps them through sign-in. */}
      <Navigation ref={navigationRef} theme={navigationTheme} linking={{ enabled: 'auto', prefixes: ['azignia://'], filter: (url) => !parseJoinLink(url) }} />
      <LinkWatcher />
      {status === 'signedIn' && (
        <>
          <QuickAddSheet />
          <TaskFieldSheet />
          <BrowseSheet />
          <BulkSheet />
          <ActionSheetHost />
          <ReminderSync />
          <PushWatcher />
          <NotificationAskSheet />
          <NetworkLogAccess />
        </>
      )}
      <ToastHost />
    </>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
