/**
 * What a finish may change: the paper, the inks and the foil. The layout and the content of a card
 * are the same in every finish.
 */
export interface CardFinishInks {
  /** The dark edge around the card. */
  readonly frame: string;
  readonly paper: string;
  /** The panel the monster stands in, and its dot screen. */
  readonly panel: string;
  readonly panelDot: string;
  /** The three stat tiles. */
  readonly tile: string;
  readonly ink: string;
  /** Labels, the number and the caught line. */
  readonly muted: string;
  readonly flavour: string;
  /** The stamp, the filled dread pips and the catch time. */
  readonly accent: string;
  readonly onAccent: string;
  /** The pill behind the task line. */
  readonly pill: string;
  readonly pillInk: string;
  /** The colours of the foil band, from its leading edge to its trailing edge. */
  readonly foil: readonly [string, string, string, string, string];
  /** How strongly the foil band and the glare print, 0 to 1. */
  readonly foilAlpha: number;
  readonly glare: string;
}
