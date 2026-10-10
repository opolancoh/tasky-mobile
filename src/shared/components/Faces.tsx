import { StyleSheet, View } from 'react-native';

import { Text, useTheme } from '@/shared/ui';

/** Initials in a round avatar; its colors come from the palette's pairs, by a stable hash of the user id. */
export function Avatar({ name, seed, size = 30 }: { name: string; seed: string; size?: number }) {
  const { colors } = useTheme();
  const [bg, fg] = colors.avatars[hash(seed) % colors.avatars.length];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text variant="caption" style={{ color: fg, fontSize: size < 28 ? 10 : 11 }}>{initials(name)}</Text>
    </View>
  );
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
