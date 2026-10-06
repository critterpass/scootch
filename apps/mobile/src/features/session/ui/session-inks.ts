import { colors, type ColorScheme, type Palette } from '@scootch/tokens';

/** The session's own inks on top of the palette: the timer's track and the quiet disc. */
export interface SessionInks extends Palette {
  /** The thin ring the disc shrinks inside, and the unfilled part of the hold ring. */
  readonly track: string;
  /** The disc of a serious task: ink-grey, never tomato. */
  readonly quietDisc: string;
  /** The filled button: ink in light, paper in dark. */
  readonly button: string;
  readonly onButton: string;
}

export function sessionInks(scheme: ColorScheme): SessionInks {
  const palette = colors[scheme];
  return {
    ...palette,
    track: scheme === 'dark' ? '#3A342E' : '#E7E1D7',
    quietDisc: scheme === 'dark' ? '#5B544C' : '#B9B1A7',
    button: palette.ink,
    onButton: palette.page,
  };
}
