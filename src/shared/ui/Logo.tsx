import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

/** The app icon's mark (M77, M126): the blue disk with its check, without the halo at this size, and the name. */
export function Logo({ size = 30 }: { size?: number }) {
  const { colors, space } = useTheme();
  return (
    <View style={[styles.row, { gap: space.sm }]} accessibilityRole="header" accessibilityLabel="Azignia">
      <LinearGradient colors={colors.accentGradient as unknown as readonly [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.mark, { width: size, height: size, borderRadius: size / 2 }]}>
        <Feather name="check" size={size * 0.55} color={colors.onAccent} />
      </LinearGradient>
      <Text variant="headline" style={{ fontSize: 19 }}>
        Azignia
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  mark: { alignItems: 'center', justifyContent: 'center' },
});
