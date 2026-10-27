import type { Frame } from '../motion/hand-off';

/**
 * Where everything sits on iPhone Duo, as the Duo board lays it out, worked out from the window
 * and the hinge alone so every screen reads the same answer.
 *
 * - `phone`: any other iPhone. Screens keep their own layout.
 * - `closed`: the outer display. One task; the controls run down the trailing edge.
 * - `open`: the inner display flat, in landscape. The board hangs as the left page.
 * - `book`: half open in landscape. Both pages step away from the fold.
 * - `stand`: the inner display in portrait (on a desk, half open). The room above, the work below.
 * - `split`: beside another app. The controls move to the outer edge.
 */
export type FoldPose = 'phone' | 'closed' | 'open' | 'book' | 'stand' | 'split';

export type HingeStatus = 'none' | 'unknown' | 'closed' | 'partial' | 'open';

/** What the hinge says (modules/phusclass-fold), or null where nothing reports it. */
export interface FoldReading {
  readonly status: HingeStatus;
  /** Degrees. */
  readonly angle: number;
  /** The strip the system keeps clear where the screen folds, in window points. */
  readonly division: Frame | null;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** iPhone Duo, measured on the iOS 27.1 simulator (points). */
export const DUO = {
  /** The outer display, portrait (1398 × 2034 px at 3×). */
  outer: { width: 466, height: 678 },
  /** The inner display, landscape (2853 × 2007 px at 3×); it folds at its middle. */
  inner: { width: 951, height: 669 },
  /** Kept clear around the fold when half open, where the system does not say. */
  foldClear: 48,
  /** The column of controls on the side, with 44-point targets. */
  column: 64,
  /** Between a floating card and the screen's edge. */
  gap: 14,
} as const;

/** A card floating over the room, or a half of the screen (the stand). */
export interface SheetFrame {
  readonly left: number;
  readonly width: number;
  /** Its foot above the window's foot. */
  readonly bottom: number;
  /** Its top, where the sheet fills a half; null where its content sets its height. */
  readonly top: number | null;
  readonly floating: boolean;
}

export interface FoldLayout {
  readonly pose: FoldPose;
  readonly width: number;
  readonly height: number;
  /** Where the controls sit: a column on one side, a bar along the foot, or none (phone). */
  readonly controls: 'trailing' | 'leading' | 'bottom' | null;
  /** The left page the board hangs on, open and half open. */
  readonly boardPage: Frame | null;
  /** Where the room is drawn. */
  readonly room: Frame;
  /** The task's sheet on Duo; null on a phone, which keeps its own. */
  readonly sheet: SheetFrame | null;
  /** The fold to keep clear, half open. */
  readonly fold: Frame | null;
  /** The part of the room he is framed in, across the window (x and width). */
  readonly focus: { readonly x: number; readonly width: number };
}

function near(a: Size, b: Size): boolean {
  const same = Math.abs(a.width - b.width) <= 1 && Math.abs(a.height - b.height) <= 1;
  const turned = Math.abs(a.width - b.height) <= 1 && Math.abs(a.height - b.width) <= 1;
  return same || turned;
}

/** Which pose the phone is in. */
export function foldPose(window: Size, screen: Size, reading: FoldReading | null): FoldPose {
  const hinge = reading !== null && reading.status !== 'none';
  const outer = near(screen, DUO.outer);
  const inner = near(screen, DUO.inner);
  if (!hinge && !outer && !inner) return 'phone';
  if (outer || (!inner && reading?.status === 'closed')) return 'closed';
  if (window.width < screen.width - 1) return 'split';
  if (window.height > window.width) return 'stand';
  const half = reading?.status === 'partial' || (reading?.division ?? null) !== null;
  return half ? 'book' : 'open';
}

/** The fold half open: the system's strip, or one of `DUO.foldClear` at the middle. */
function foldStrip(pose: FoldPose, window: Size, reading: FoldReading | null): Frame | null {
  if (pose !== 'book' && pose !== 'stand') return null;
  if (reading?.division) return reading.division;
  const clear = DUO.foldClear;
  return pose === 'book'
    ? { x: window.width / 2 - clear / 2, y: 0, width: clear, height: window.height }
    : { x: 0, y: window.height / 2 - clear / 2, width: window.width, height: clear };
}

/**
 * The layout for a pose. The system's own controls run down one side on Duo, and the side with
 * the larger inset is theirs; ours join them there.
 */
export function foldLayout(
  window: Size,
  screen: Size,
  reading: FoldReading | null,
  insets: Insets,
): FoldLayout {
  const pose = foldPose(window, screen, reading);
  const { width, height } = window;
  const whole: Frame = { x: 0, y: 0, width, height };
  const base = { pose, width, height, fold: null, boardPage: null, room: whole };
  if (pose === 'phone') {
    return { ...base, controls: null, sheet: null, focus: { x: 0, width } };
  }
  const { gap, column } = DUO;
  const fold = foldStrip(pose, window, reading);
  if (pose === 'stand') {
    const top = fold ? fold.y + fold.height : height / 2;
    return {
      ...base,
      fold,
      controls: 'bottom',
      room: { x: 0, y: 0, width, height: fold ? fold.y : height / 2 },
      sheet: { left: 0, width, bottom: 0, top, floating: false },
      focus: { x: 0, width },
    };
  }
  const leading = insets.left > insets.right;
  const controls = leading ? 'leading' : 'trailing';
  const inside = leading ? column : 0;
  const end = width - (leading ? 0 : column);
  if (pose === 'open' || pose === 'book') {
    const middle = width / 2;
    // Flat, the pages sit close to the middle; half open, both step away from the fold.
    const pageEnd = fold ? fold.x - gap : middle - 38;
    const sheetLeft = fold ? fold.x + fold.width + gap : middle - 24;
    return {
      ...base,
      fold,
      controls,
      boardPage: { x: gap, y: gap, width: pageEnd - gap, height: height - gap * 2 },
      sheet: {
        left: sheetLeft,
        width: end - gap - sheetLeft,
        bottom: gap,
        top: null,
        floating: true,
      },
      focus: { x: sheetLeft, width: end - sheetLeft },
    };
  }
  // Closed and beside another app: one card in the corner, clear of the controls.
  return {
    ...base,
    controls,
    sheet: {
      left: inside + gap,
      width: end - inside - gap * 2,
      bottom: gap,
      top: null,
      floating: true,
    },
    focus: { x: inside, width: end - inside },
  };
}

/** The board shows as a page beside the desk, rather than as a screen of its own. */
export function boardIsPage(pose: FoldPose): boolean {
  return pose === 'open' || pose === 'book';
}
