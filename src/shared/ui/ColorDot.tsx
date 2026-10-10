import { View } from 'react-native';

import { useTheme } from './theme';

/** A round swatch for a collection or tag color; ink3 when there is none. 12 pt by default. */
export function ColorDot({ color, size = 12 }: { color: string | null | undefined; size?: number }) {
  const { colors } = useTheme();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? colors.ink3 }} />;
}

/** A collection or tag color made faint for a tile behind its dot or "#": 13% in light, 20% in dark. */
export const faint = (color: string, scheme: 'light' | 'dark') => `${color}${scheme === 'dark' ? '33' : '22'}`;
