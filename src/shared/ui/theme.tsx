import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { defaultPalette, palettes } from './palettes';
import { radius, space, type, type Colors } from './tokens';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: Colors;
  space: typeof space;
  radius: typeof radius;
  type: typeof type;
}

const makeTheme = (scheme: 'light' | 'dark'): Theme => ({ scheme, colors: palettes[defaultPalette][scheme], space, radius, type });

const ThemeContext = createContext<Theme>(makeTheme('light'));

/** The active palette (palettes/active.json); light or dark follows the OS (05-platforms.md). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = useMemo(() => makeTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
