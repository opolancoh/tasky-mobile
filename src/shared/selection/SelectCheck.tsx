import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/ui';

/** A row's round check while selecting (M81, the hub's A): where the circle was, filled in the accent when picked. */
export function SelectCheck({ picked }: { picked: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.check, { borderColor: picked ? colors.accent : colors.ink3, backgroundColor: picked ? colors.accent : 'transparent' }]}>
      {picked && <Feather name="check" size={13} color={colors.onAccent} />}
    </View>
  );
}

const styles = StyleSheet.create({
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
