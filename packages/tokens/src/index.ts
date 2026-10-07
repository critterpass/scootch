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

/**
 * The boards' shadow recipes, as they are written there. Each is a full `boxShadow` value.
 *
 * - `glass`: under a glass control where the system has no Liquid Glass: its lit top edge, its
 *   hairline and its soft drop.
 * - `inkButton`: the one filled action: a lit top edge and a close, dark drop.
 * - `card`: a white card on the page: a hairline and a wide, faint drop.
 */
export const shadows = {
  glass:
    'inset 0 1px 0.5px rgba(255,255,255,0.95), inset 0 -0.5px 0.5px rgba(255,255,255,0.5), 0 0 0 0.5px rgba(28,26,23,0.16), 0 10px 30px -8px rgba(28,26,23,0.18)',
  inkButton: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 6px 16px -4px rgba(28,26,23,0.35)',
  card: '0 0 0 0.5px rgba(28,26,23,0.06), 0 8px 24px -6px rgba(28,26,23,0.10)',
} as const;

/** Tracking, as a share of the type size: the boards' `letter-spacing` in em. */
export const tracking = {
  /** Button labels. */
  action: -0.01,
  /** Headings in the rounded face. */
  heading: -0.02,
} as const;
