/**
 * Design tokens other than color: spacing, radius and type. Colors live in `palettes/` (one file per
 * palette); components read both through `useTheme()`. Never hard-code a color outside `palettes/`.
 */

import type { PaletteColors } from './palettes';

export type Colors = PaletteColors;

/** Colors a user can give a collection or tag: user data, the same in every palette. The API stores any hex; the Inbox default is #4A90E2. */
// eslint-disable-next-line no-restricted-syntax -- user data colors, not the palette
export const collectionColors = ['#4A90E2', '#1089B4', '#12A07A', '#7BB32E', '#E0A11B', '#E0772F', '#E8404C', '#D9508A', '#8A5CD6', '#5F6B7A'] as const;

/** 4-point grid. */
export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 14, xl: 20, pill: 999 } as const;

/** Figtree, loaded in App.tsx. Custom fonts pick weight by family name, not fontWeight. */
export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const;

export const type = {
  largeTitle: { fontFamily: fonts.semibold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  headline: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  callout: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  subhead: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17 },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
} as const;

export type TypeVariant = keyof typeof type;
