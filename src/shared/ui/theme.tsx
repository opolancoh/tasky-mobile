import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { useAppearance } from './appearance';

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

/**
 * The active palette (palettes/active.json) in the user's Appearance (M68): Light (default), Dark, or System, which
 * follows the phone. The choice also goes to the OS, so alerts, the keyboard and pickers match.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const appearance = useAppearance((s) => s.appearance);
  const os = useColorScheme();
  useEffect(() => {
    Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);
  const scheme = appearance === 'system' ? (os === 'dark' ? 'dark' : 'light') : appearance;
  const theme = useMemo(() => makeTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
