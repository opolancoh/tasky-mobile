import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { HistoryEntry } from '@/data/tasks/types';
import { Avatar } from '@/shared/components';
import { Text, useTheme } from '@/shared/ui';

import { useHistoryText } from './useHistoryText';
import { useWhen } from './useWhen';

/** One change (M83, the hub's B): a small face (a grey gear when nobody did it by hand), "**You** moved the due date…" and when. */
export function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const { colors, space } = useTheme();
  const words = useHistoryText();
  const when = useWhen();
  const { who, text } = words(entry);
  const person = entry.actor && who ? entry.actor : null;
  return (
    <View style={[styles.row, { gap: space.sm, paddingVertical: space.xs + 2 }]} accessible accessibilityLabel={`${who ? `${who} ` : ''}${text}, ${when(entry.at)}`}>
      {person ? (
        <Avatar name={person.displayName || '?'} seed={person.id} size={22} />
      ) : (
        <View style={[styles.gear, { backgroundColor: colors.surface2 }]}>
          <Feather name="settings" size={12} color={colors.ink3} />
        </View>
      )}
      <View style={styles.main}>
        <Text variant="subhead" color="ink2">
          {who ? <Text variant="subhead" style={styles.who}>{`${who} `}</Text> : null}
          {text}
        </Text>
        <Text variant="caption" color="ink3">{when(entry.at)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  gear: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, minWidth: 0, gap: 1 },
  who: { fontWeight: '600' },
});
