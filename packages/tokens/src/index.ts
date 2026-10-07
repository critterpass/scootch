// Inks, type, spacing and motion.
import palettes from './colors.json';

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** The screen behind everything. */
  readonly page: string;
  /** Cards and sheets that sit on the page. */
  readonly surface: string;
  readonly ink: string;
  readonly muted: string;
  readonly tomato: string;
  /** Text and icons on tomato. Dark ink in both schemes: tomato never carries white. */
  readonly onTomato: string;
  /** The soft printed shape behind the critter. */
  readonly risoBlob: string;
  /** Words that have already gone by: the older part of a live transcript. */
  readonly faint: string;
  /** The small arrow at the end of a row. */
  readonly chevron: string;
}

// The values live in JSON so the app config, which loads outside the bundler, can read them too.
export const colors: Readonly<Record<ColorScheme, Palette>> = palettes;

/** Font family names as iOS resolves them: SF Pro Rounded for headings, SF Pro Text for body. */
export const fonts = {
  heading: 'ui-rounded',
  body: 'System',
} as const;

export const fontSizes = {
  body: 17,
  action: 19,
  sentence: 32,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;
