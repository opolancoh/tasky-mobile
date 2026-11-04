import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

/** A section's count in a small grey pill (M144). */
export function CountPill({ count }: { count: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surface2 }]}>
      <Text variant="caption" color="ink3">{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999 },
});
