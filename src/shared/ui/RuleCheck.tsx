import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

/**
 * A rule the input must meet, checked as the person types (HIG: validate passwords before they leave
 * the field). Gray with an empty circle until met, then green with a check; red once a tap on submit finds it unmet (`missed`, M123).
 */
export function RuleCheck({ met, label, missed = false }: { met: boolean; label: string; missed?: boolean }) {
  const { colors, space } = useTheme();
  const color = met ? colors.success : missed ? colors.danger : colors.ink3;
  return (
    <View style={[styles.row, { gap: space.xs + 2 }]} accessibilityLiveRegion="polite" accessibilityState={{ checked: met }}>
      <View style={[styles.dot, { borderColor: color, backgroundColor: met ? color : 'transparent' }]}>
        {met && <Feather name="check" size={10} color={colors.surface} />}
      </View>
      <Text variant="footnote" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
