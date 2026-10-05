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

import { QuickAddSheet } from '@/features/quick-add/QuickAddSheet';
import { TaskFieldSheet } from '@/features/task/TaskFieldSheet';
import { SessionProvider, useSession } from '@/shared/session/SessionProvider';
import { fonts, ThemeProvider, ToastHost, useTheme } from '@/shared/ui';

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

/** Keeps the splash screen up until fonts are loaded and the stored session is checked. */
function Root() {
  const [fontsLoaded] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold });
  const { status } = useSession();
  const { colors, scheme } = useTheme();
  const ready = fontsLoaded && status !== 'loading';

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

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Navigation theme={navigationTheme} linking={{ enabled: 'auto', prefixes: ['tasky://'] }} />
      {status === 'signedIn' && (
        <>
          <QuickAddSheet />
          <TaskFieldSheet />
        </>
      )}
      <ToastHost />
    </>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
