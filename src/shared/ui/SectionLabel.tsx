import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

interface SectionAction {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}

/**
 * A small upper-case heading over a group of rows ("ALL TAGS", "CUSTOM"): label type, ink3, tracked out.
 * `action`: one icon at its right, in the accent (Share on a section of an error report or a logged call, M91).
 */
export function SectionLabel({ children, style, action }: { children: string; style?: StyleProp<TextStyle>; action?: SectionAction }) {
  const { colors, space } = useTheme();
  const label = (
    <Text variant="label" color="ink3" accessibilityRole="header" style={[{ letterSpacing: 0.6 }, !action && { marginTop: space.xl, marginBottom: space.xs }, action && styles.grow, style]}>
      {children.toUpperCase()}
    </Text>
  );
  if (!action) return label;
  return (
    <View style={[styles.row, { marginTop: space.xl, marginBottom: space.xs }]}>
      {label}
      <Pressable onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={12}>
        {({ pressed }) => <Feather name={action.icon} size={16} color={colors.accent} style={{ opacity: pressed ? 0.5 : 1 }} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
});
