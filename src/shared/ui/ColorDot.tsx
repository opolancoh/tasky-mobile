import { View } from 'react-native';

import { useTheme } from './theme';

/** A round swatch for a collection or tag color; ink3 when there is none. 12 pt by default. */
export function ColorDot({ color, size = 12 }: { color: string | null | undefined; size?: number }) {
  const { colors } = useTheme();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? colors.ink3 }} />;
}
