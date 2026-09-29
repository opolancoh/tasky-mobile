import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';

export interface AddTaskRowProps {
  label: string;
  onPress(): void;
}

/**
 * The "Add a task" row above the tab bar (decision M11, tab bar option D). List tabs place it last,
 * outside their scrolling list, so it never covers a row. Search leaves it out.
 */
export function AddTaskRow({ label, onPress }: AddTaskRowProps) {
  const { colors, radius, space } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          gap: space.sm,
          paddingHorizontal: space.md,
          marginBottom: space.sm,
          borderRadius: radius.lg,
          borderColor: colors.line,
          backgroundColor: pressed ? colors.surface2 : colors.surface,
          shadowColor: colors.heading,
        },
      ]}
    >
      {({ pressed }) => (
        <>
          <Feather name="plus" size={20} color={pressed ? colors.accentPressed : colors.accent} />
          <Text variant="bodyMedium" style={{ color: pressed ? colors.accentPressed : colors.accent }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** At least 44 pt tall (HIG); grows with the text size. */
  row: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
});
