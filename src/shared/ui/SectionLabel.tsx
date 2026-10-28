import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

interface SectionAction {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}

interface SectionInfo {
  label: string;
  onPress: () => void;
}

/**
 * A small upper-case heading over a group of rows ("ALL TAGS", "CUSTOM"): label type, ink3, tracked out.
 * `action`: one icon at its right, in the accent (Share on a section of an error report or a logged call, M91).
 * `info`: a grey ⓘ right after the words, that explains the section (the List page's kinds of lists, M111).
 */
export function SectionLabel({ children, style, action, info }: { children: string; style?: StyleProp<TextStyle>; action?: SectionAction; info?: SectionInfo }) {
  const { colors, space } = useTheme();
  const label = (
    <Text variant="label" color="ink3" accessibilityRole="header" style={[{ letterSpacing: 0.6 }, !action && !info && { marginTop: space.xl, marginBottom: space.xs }, action && styles.grow, style]}>
      {children.toUpperCase()}
    </Text>
  );
  if (!action && !info) return label;
  return (
    <View style={[styles.row, { marginTop: space.xl, marginBottom: space.xs, gap: space.xs }]}>
      {label}
      {info && (
        <Pressable onPress={info.onPress} accessibilityRole="button" accessibilityLabel={info.label} hitSlop={14}>
          {({ pressed }) => <Feather name="info" size={14} color={colors.ink3} style={{ opacity: pressed ? 0.5 : 1 }} />}
        </Pressable>
      )}
      {action && (
        <Pressable onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={12}>
          {({ pressed }) => <Feather name={action.icon} size={16} color={colors.accent} style={{ opacity: pressed ? 0.5 : 1 }} />}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
});
