/**
 * The board's inks and measures, as the App board draws the board and the logbook page. The board
 * is a green chalkboard in either appearance; the logbook page is paper, dimmed in the dark.
 */
export const CHALK = {
  board: '#2F6B56',
  /** The lighter band of reflected window light across its left side. */
  band: '#357560',
  chalk: '#EEF6F0',
  white: '#FFFFFF',
  /** Dates in the corner. */
  date: '#F7D774',
  tally: '#FF9AA0',
  /** The dot by the task on the desk. */
  desk: '#FF8A80',
  rule: 'rgba(238,246,240,0.18)',
  ring: 'rgba(238,246,240,0.5)',
  faint: 'rgba(238,246,240,0.72)',
  pill: 'rgba(255,255,255,0.14)',
  pillLine: 'rgba(238,246,240,0.3)',
  /** The wooden ledge along the bottom, which pushes the board back up. */
  ledge: '#8A5A36',
  handle: 'rgba(255,241,220,0.7)',
  /** The swipe actions behind a row. */
  toDesk: '#C9241E',
  tick: '#3E8E5A',
  erase: '#1E4A3C',
  /** The panel a row's actions open in. */
  panel: '#24584A',
  scrim: 'rgba(8,20,16,0.4)',
} as const;

export interface PaperInks {
  readonly page: string;
  readonly ink: string;
  readonly muted: string;
  readonly body: string;
  readonly rule: string;
  readonly margin: string;
  readonly red: string;
  readonly hole: string;
  readonly handle: string;
}

export const PAPER: Readonly<Record<'light' | 'dark', PaperInks>> = {
  light: {
    page: '#FBF6EC',
    ink: '#1C1A18',
    muted: '#8A7F74',
    body: '#6B655E',
    rule: 'rgba(43,76,154,0.10)',
    margin: 'rgba(212,42,36,0.3)',
    red: '#D42A24',
    hole: 'rgba(28,26,24,0.12)',
    handle: 'rgba(28,26,24,0.2)',
  },
  dark: {
    page: '#26221D',
    ink: '#F3EEE6',
    muted: '#A99F93',
    body: '#BDB3A6',
    rule: 'rgba(160,180,230,0.12)',
    margin: 'rgba(240,110,100,0.35)',
    red: '#F06A60',
    hole: 'rgba(0,0,0,0.35)',
    handle: 'rgba(243,238,230,0.3)',
  },
};

/** Measures, in points, from the App board. */
export const BOARD = {
  rowMin: 48,
  /** The hand font on the board, before any text size. */
  chalkSize: 24,
  markSize: 18,
  /** Each swipe action's width. */
  actionWidth: 66,
  /** A row let go past this far left stays open on its actions. */
  opensPast: 60,
  ledge: 40,
  figure: 104,
  /** The pull that lowers the logbook: its whole travel, and the mark that opens it. */
  logbookTravel: 300,
  logbookOpensPast: 130,
  /** The push up on the ledge: its whole travel, and the mark that closes the board. */
  closeTravel: 300,
  closesPast: 80,
  flick: 800,
  /** The board's grow and the logbook's lowering, on the interface curve. */
  openMs: 560,
  closeMs: 520,
} as const;

/**
 * Measures, in points, of the board as the left page beside the desk on iPhone Duo, from the Duo
 * boards: closer rows and a smaller hand than the board's own screen, so the whole list fits
 * above his line.
 */
export const PAGE = {
  rowMin: 44,
  chalkSize: 21,
  markSize: 16,
  title: 28,
  dateSize: 17,
  /** Above the heading, and between the heading and the first row. */
  headTop: 26,
  listTop: 16,
  /** The list's sides, less the row's own inset. */
  listLeft: 12,
  listRight: 10,
  /** The wooden frame's foot, where the ledge and the chalk lie. */
  ledge: 22,
} as const;

/** The App board's phone: the chalkboard on the desk is this rectangle of a 390 by 844 screen. */
export const DESIGN_SCREEN = { width: 390, height: 844 } as const;
export const DESIGN_CHALKBOARD = { x: 0, y: 100, width: 375, height: 195 } as const;
