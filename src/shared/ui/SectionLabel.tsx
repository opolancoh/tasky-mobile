import type { StyleProp, TextStyle } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

/** A small upper-case heading over a group of rows ("ALL TAGS", "CUSTOM"): label type, ink3, tracked out. */
export function SectionLabel({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  const { space } = useTheme();
  return (
    <Text variant="label" color="ink3" accessibilityRole="header" style={[{ marginTop: space.xl, marginBottom: space.xs, letterSpacing: 0.6 }, style]}>
      {children.toUpperCase()}
    </Text>
  );
}
