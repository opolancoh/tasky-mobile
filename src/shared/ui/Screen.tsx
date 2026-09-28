import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from './theme';

export interface ScreenProps {
  children: ReactNode;
  /** Scrolls the content; forms also move above the keyboard. */
  scroll?: boolean;
  /** Safe-area edges to pad. Screens under a header or tab bar leave those edges out. */
  edges?: Edge[];
  contentStyle?: ViewStyle;
}

/** Every screen's root: background, safe areas, side padding, optional scrolling. */
export function Screen({ children, scroll = false, edges = ['top', 'bottom'], contentStyle }: ScreenProps) {
  const { colors, space } = useTheme();
  const padding = { paddingHorizontal: space.xxl, flexGrow: 1 };

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.bg }]}>
      {scroll ? (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={[padding, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={[padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
