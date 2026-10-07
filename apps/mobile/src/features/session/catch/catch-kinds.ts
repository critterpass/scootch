import type { Id } from '@scootch/domain';

/**
 * The eight ways a task's monster is caught, in the order the roll counts them. The order is
 * stored nowhere but here: changing it changes the catch of every task not yet finished.
 */
export const CATCH_KINDS = [
  'jar',
  'reel',
  'lasso',
  'sticker',
  'bubble',
  'net',
  'vacuum',
  'envelope',
] as const;

export type CatchKind = (typeof CATCH_KINDS)[number];

/** Where a catch writes its words: under the corner row, or at the foot. */
export const CAPTION_AT: Readonly<Record<CatchKind, 'top' | 'bottom'>> = {
  jar: 'bottom',
  reel: 'top',
  lasso: 'bottom',
  sticker: 'top',
  bubble: 'bottom',
  net: 'bottom',
  vacuum: 'top',
  envelope: 'bottom',
};

/**
 * The part of the board each catch is drawn in, top to bottom in the board's points. A phone
 * shorter than the board keeps this part whole and gives up the empty paper round it.
 */
export const DRAWN_IN: Readonly<
  Record<CatchKind, { readonly top: number; readonly bottom: number }>
> = {
  jar: { top: 130, bottom: 580 },
  reel: { top: 250, bottom: 815 },
  lasso: { top: 120, bottom: 580 },
  sticker: { top: 176, bottom: 800 },
  bubble: { top: 120, bottom: 580 },
  net: { top: 120, bottom: 700 },
  vacuum: { top: 300, bottom: 570 },
  envelope: { top: 120, bottom: 500 },
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The catch a task rolls. It is worked out from the task itself, so the same task shows the same
 * catch however often it is opened, and nothing has to be stored.
 */
export function catchFor(taskId: Id): CatchKind {
  return CATCH_KINDS[hash(taskId) % CATCH_KINDS.length] ?? 'jar';
}
