import type { OneScreenShown } from './one-screen-shown';

/**
 * How each state of the one screen is laid out on its board: where Scootch stands, how big he is,
 * and how his sentence is set. Points, as the boards give them.
 */
export interface FigureFrame {
  /** Scootch's own size. */
  readonly figure: number;
  /** The height of the space he stands at the bottom of. */
  readonly box: number;
  /** From the corner controls down to that space. */
  readonly top: number;
  /** From his feet down to the words. */
  readonly textTop: number;
  /** His sentence's type size; its line is 1.14 of it. */
  readonly sentence: number;
}

const frame = (
  figure: number,
  box: number,
  top: number,
  textTop: number,
  sentence = 30,
): FigureFrame => ({ figure, box, top, textTop, sentence });

export const FRAMES = {
  waiting: frame(300, 300, 18, 8),
  firstOneThing: frame(270, 280, 18, 10, 28),
  listening: frame(260, 260, 30, 12),
  taskSet: frame(200, 250, 16, 2, 27),
  done: frame(260, 260, 30, 8),
  energy: frame(220, 230, 18, 8),
  // The board stands him 230 high in a 240 space, 18 down. Here he keeps the one thing's space and
  // place, so only his size changes as the headline lands and nothing on the screen jumps.
  choosing: frame(230, 260, 24, 10),
  oneThing: frame(250, 260, 24, 10),
  picked: frame(260, 270, 24, 10),
  bargain: frame(280, 280, 22, 10),
  hatch: frame(190, 250, 16, 10),
} as const satisfies Record<string, FigureFrame>;

/** The monster beside Scootch as it hatches, and on the task set: its size, and how far it tucks in. */
export const HATCH_MONSTER = { size: 180, overlap: 34 } as const;
export const TASK_SET_MONSTER = { size: 150, overlap: 34 } as const;
/** The line of Scootch's sentence, as a share of its size. */
export const SENTENCE_LINE = 1.14;
/** The least line that keeps Vietnamese's stacked marks from touching the line above. */
const VIETNAMESE_LINE = 1.2;
/** At most this share of the window's height is Scootch's, so a short phone keeps its words. */
const FIGURE_SHARE = 0.36;

/** A heading's line for a language: the board's, opened up where stacked marks need the room. */
export function lineOf(board: number, language: string): number {
  return language === 'vi' ? Math.max(board, VIETNAMESE_LINE) : board;
}

/** Scootch's size in a window: the board's, held inside the width and a share of the height. */
export function figureIn(figure: number, width: number, height: number): number {
  return Math.round(Math.min(figure, width - GUTTER.words * 2, height * FIGURE_SHARE));
}
/** The gutters of the boards: words, the choices under them, and the dock. */
export const GUTTER = { words: 28, choices: 20, dock: 14 } as const;
/** From the bottom of the screen up to the dock. */
export const DOCK_BOTTOM = 30;

/**
 * The space under the dock, inside the safe area. The board's 30 points are measured from the
 * bottom of a phone with a home bar, which already keeps more than that clear: there the dock sits
 * on the safe area's edge. A phone with no home bar gets the 30 points.
 */
export function dockGap(safeBottom: number): number {
  return Math.max(0, DOCK_BOTTOM - safeBottom);
}

export interface FrameAsk {
  readonly kind: 'composer' | 'task_set' | 'panel' | 'done' | 'quiet';
  /** A panel's name. */
  readonly name?: string;
  /** The first ask after first launch, with its example chips. */
  readonly warmUp?: boolean;
  readonly recording?: boolean;
  /** The choosing reveal is playing: Scootch is thinking. */
  readonly choosing?: boolean;
}

/** The board's frame for a state of the one screen. */
export function frameFor(ask: FrameAsk): FigureFrame {
  if (ask.kind === 'task_set') return FRAMES.taskSet;
  if (ask.kind === 'done') return FRAMES.done;
  if (ask.kind === 'panel') {
    if (ask.name === 'energy') return FRAMES.energy;
    if (ask.name === 'picked') return FRAMES.picked;
    if (ask.name === 'bargain') return FRAMES.bargain;
    if (ask.name === 'hatch') return FRAMES.hatch;
    return ask.choosing ? FRAMES.choosing : FRAMES.oneThing;
  }
  if (ask.recording) return FRAMES.listening;
  return ask.warmUp ? FRAMES.firstOneThing : FRAMES.waiting;
}

/** The frame for what the one screen is showing; `thinking` is Scootch while the reveal plays. */
export function frameOfShown(shown: OneScreenShown, thinking: boolean): FigureFrame {
  if (shown.kind === 'panel')
    return frameFor({ kind: 'panel', name: shown.name, choosing: thinking });
  if (shown.kind !== 'composer') return frameFor({ kind: shown.kind });
  const { phase } = shown.composer.state;
  return frameFor({
    kind: 'composer',
    warmUp: shown.warmUp !== null,
    recording: phase === 'listening' || phase === 'finishing',
  });
}

/** Where the chosen pill of a segmented control sits: `index` segments along, inside the padding. */
export function segmentOffset(
  index: number,
  width: number,
  count: number,
  padding: number,
): number {
  'worklet';
  if (count <= 0 || width <= 0) return 0;
  return ((width - padding * 2) / count) * index;
}
