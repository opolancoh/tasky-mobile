import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

/** A message above a form: an error the user can act on, or information. */
export function Notice({ tone = 'danger', children }: { tone?: 'danger' | 'info'; children: string }) {
  const { colors, radius, space } = useTheme();
  const fg = tone === 'danger' ? colors.danger : colors.accent;
  const bg = tone === 'danger' ? colors.dangerSoft : colors.accentSoft;
  return (
    <View accessibilityRole="alert" style={[styles.row, { backgroundColor: bg, borderRadius: radius.md, padding: space.md, gap: space.sm }]}>
      <Feather name={tone === 'danger' ? 'alert-circle' : 'info'} size={17} color={fg} style={styles.icon} />
      <Text variant="subhead" style={styles.text}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { marginTop: 1 },
  text: { flex: 1 },
});
