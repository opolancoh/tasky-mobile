/**
 * The colors a palette must define, for light and dark. Each palette is a JSON file in this folder;
 * index.ts checks every file against this type, so a missing or misspelled color fails the type check.
 * Every screen and component reads colors only through `useTheme().colors`, so a palette file is the
 * whole look.
 *
 * Contrast minimums (WCAG AA, Calm ocean · HIG, 06-mobile.md), measured against `bg`:
 * - text: `ink`, `ink2`, `ink3`, `heading`, `accent`, `danger` ≥ 4.5:1
 * - `onAccent` on `accent` ≥ 4.5:1
 * - `fieldLine` (text field edges) ≥ 3:1
 */
export interface PaletteColors {
  /** Screen background. */
  bg: string;
  /** Cards, sheets, fields that need a fill. */
  surface: string;
  /** Grey fills: chips, notices, empty boxes. */
  surface2: string;
  /** Dividers between content. */
  line: string;
  /** Text field edges: visible before tapping (≥ 3:1). */
  fieldLine: string;
  /** Behind sheets and dialogs. */
  scrim: string;

  /** Titles. */
  heading: string;
  /** Body text. */
  ink: string;
  /** Secondary text. */
  ink2: string;
  /** Hints and placeholders (still ≥ 4.5:1). */
  ink3: string;

  /** Links, the main button, active states. */
  accent: string;
  accentPressed: string;
  accentDisabled: string;
  /** Text and icons on `accent`. */
  onAccent: string;
  onAccentDisabled: string;
  /** Soft fills: info notices, focus, unread. */
  accentSoft: string;
  /** Add button and logo, top-left to bottom-right. May be brighter than `accent`: no text on it needs contrast. */
  accentGradient: readonly string[];
  chipSelected: string;
  onChipSelected: string;

  /** Overdue, Important, errors, delete. */
  danger: string;
  dangerSoft: string;
  /** Pending. */
  warn: string;
  warnSoft: string;
  /** Spare: it marked Low priority before the Important flag (M18). */
  low: string;
  lowSoft: string;
  /** Completed, accepted, rules met. */
  success: string;
  successSoft: string;

  unreadBg: string;
  unreadDot: string;
  /** A tag without its own color (the API's default). */
  tagDefault: string;
  toastBg: string;
  toastInk: string;
  toastAction: string;

  /** Initials avatars: [background, text], picked by a stable hash of the user id. */
  avatars: readonly (readonly string[])[];
}

export interface Palette {
  name: string;
  description: string;
  light: PaletteColors;
  dark: PaletteColors;
}
