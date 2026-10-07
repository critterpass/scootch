import { colors, type ColorScheme, type Palette } from '@scootch/tokens';

/** The session's own inks on top of the palette: the timer's track and the quiet disc. */
export interface SessionInks extends Palette {
  /** The thin ring the disc shrinks inside, and the unfilled part of the hold ring. */
  readonly track: string;
  /** The disc of a serious task: ink-grey, never tomato. */
  readonly quietDisc: string;
  /** The ring the disc shrinks inside: ink at 12%, a line and no more. */
  readonly ringLine: string;
  /** The page of a serious task: the same paper with the warmth turned down. */
  readonly quietPage: string;
  /** A hairline between rows: ink at 12%. */
  readonly hairline: string;
  /** The chevron at the end of a row. */
  readonly chevron: string;
  /** The filled button: ink in light, paper in dark. */
  readonly button: string;
  readonly onButton: string;
}

export function sessionInks(scheme: ColorScheme): SessionInks {
  const palette = colors[scheme];
  return {
    ...palette,
    track: scheme === 'dark' ? '#3A342E' : '#E7E1D7',
    quietDisc: scheme === 'dark' ? '#5B544C' : '#B9B2A8',
    ringLine: scheme === 'dark' ? 'rgba(243,238,230,0.16)' : 'rgba(28,26,23,0.12)',
    quietPage: scheme === 'dark' ? palette.page : '#EFEDE9',
    chevron: scheme === 'dark' ? '#7A7268' : '#B5AEA4',
    hairline: scheme === 'dark' ? 'rgba(243,238,230,0.14)' : 'rgba(28,26,23,0.12)',
    button: palette.ink,
    onButton: palette.page,
  };
}
