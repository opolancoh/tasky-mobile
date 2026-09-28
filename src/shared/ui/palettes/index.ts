import active from './active.json';
import azure from './azure.json';
import type { Palette } from './types';

/**
 * Every palette the app can use, one JSON file each. `satisfies` checks each file against `Palette`.
 *
 * Change the app's colors: set "palette" in active.json (also read by app.config.ts for the splash).
 * Add a palette: copy azure.json, change its colors, list it here.
 */
export const palettes = { azure } satisfies Record<string, Palette>;

export type PaletteId = keyof typeof palettes;

export const defaultPalette = active.palette as PaletteId;

export type { Palette, PaletteColors } from './types';
