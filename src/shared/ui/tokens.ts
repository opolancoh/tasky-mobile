/**
 * Calm ocean · HIG design tokens, from the prototype (https://claude.ai/artifact/MM37Pcm1VePn7oFGFeumhh):
 * Calm ocean after a pass with Apple's Human Interface Guidelines. Text colors meet WCAG AA (4.5:1) on
 * the background; field edges meet 3:1.
 * Components use these through `useTheme()`; never hard-code a color in a screen.
 */

export const palette = {
  light: {
    bg: '#F7F9FA',
    surface: '#FFFFFF',
    surface2: '#EEEFF1',
    /** Dividers between content. */
    line: '#E4E7EA',
    /** Text field edges: visible before tapping (3:1). */
    fieldLine: '#8A9198',
    scrim: 'rgba(0,39,51,0.40)',

    heading: '#002733',
    ink: '#101823',
    ink2: '#5F646A',
    ink3: '#6B7178',

    /** Text, links and the main button (4.6:1). The gradient keeps the brighter ocean blue. */
    accent: '#0B7AA3',
    accentPressed: '#08617F',
    accentDisabled: '#A9D6E8',
    onAccent: '#FFFFFF',
    onAccentDisabled: '#FFFFFF',
    accentSoft: '#DFF6FE',
    /** Gradient for the add button and the logo, top-left to bottom-right. */
    accentGradient: ['#36A0CA', '#1089B4'] as const,
    chipSelected: '#1E2A38',
    onChipSelected: '#FFFFFF',

    danger: '#D12F3B',
    dangerSoft: '#FFE5E7',
    warn: '#D98A12',
    warnSoft: '#FDF0DB',
    low: '#5E93AE',
    lowSoft: '#E3F0F6',
    success: '#12A07A',
    successSoft: '#DDF5EC',

    unreadBg: '#EAF8FE',
    unreadDot: '#0B7AA3',
    tagDefault: '#8E8E93',
    toastBg: '#1E2A38',
    toastInk: '#F2F6F8',
    toastAction: '#7FD0EE',
  },
  dark: {
    bg: '#0B141A',
    surface: '#111D25',
    surface2: '#18262F',
    line: '#1D2C35',
    fieldLine: '#5A6E79',
    scrim: 'rgba(0,0,0,0.55)',

    heading: '#F2F8FA',
    ink: '#E6EEF2',
    ink2: '#9DAEB8',
    ink3: '#7F929C',

    accent: '#3DB2DB',
    accentPressed: '#2A9CC4',
    accentDisabled: '#1D4A5B',
    onAccent: '#03202A',
    onAccentDisabled: '#6F97A6',
    accentSoft: '#0F3242',
    accentGradient: ['#4CC0E6', '#1C95C0'] as const,
    chipSelected: '#E6EEF2',
    onChipSelected: '#0B141A',

    danger: '#FF6B74',
    dangerSoft: '#3A1D22',
    warn: '#F0AE4A',
    warnSoft: '#35290F',
    low: '#7FB4CF',
    lowSoft: '#16303D',
    success: '#3CC79C',
    successSoft: '#10332A',

    unreadBg: '#0F2833',
    unreadDot: '#3DB2DB',
    tagDefault: '#8E8E93',
    toastBg: '#E6EEF2',
    toastInk: '#0B141A',
    toastAction: '#0B7AA3',
  },
} as const;

export type Colors = { [K in keyof typeof palette.light]: K extends 'accentGradient' ? readonly [string, string] : string };

/** Colors a user can give a collection or tag. The API stores any hex; the Inbox default is #4A90E2. */
export const collectionColors = ['#4A90E2', '#1089B4', '#12A07A', '#7BB32E', '#E0A11B', '#E0772F', '#E8404C', '#D9508A', '#8A5CD6', '#5F6B7A'] as const;

/** Initials avatars: [background, text], picked by a stable hash of the user id. */
export const avatarColors = {
  light: [['#DFF6FE', '#0B6F94'], ['#DDF5EC', '#0E7A5C'], ['#FDEEDB', '#9A5B06'], ['#F1E8FD', '#6B3FB5'], ['#FFE5E7', '#B42C37']],
  dark: [['#0F3242', '#7FD0EE'], ['#10332A', '#6FDDB8'], ['#35290F', '#F0C06A'], ['#2A1F42', '#C4A6F5'], ['#3A1D22', '#FF9AA2']],
} as const;

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
