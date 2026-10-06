/** The chance that any one catch also drops something. Each catch is its own draw. */
export const SURPRISE_DROP_CHANCE = 1 / 8;

/**
 * Everything a drop is decided from. There is no field for Plus, a purchase or the shelf, and none
 * for when the last drop fell: a drop cannot be bought, and the last one says nothing about the
 * next.
 */
export interface DropDraw {
  /** Made once on the phone and stored, so a run can be replayed. */
  readonly seed: string;
  /** Which catch this is in the user's collection, counted from one. */
  readonly catchNumber: number;
}

export interface SurpriseDrop {
  /** A number from 0 up to 1 that chooses the item from whatever the drop folder holds. */
  readonly pick: number;
}

/** A number from 0 up to 1 that depends on every character of `text` and on nothing else. */
function fractionOf(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return ((hash ^ (hash >>> 16)) >>> 0) / 2 ** 32;
}

/** The drop for one catch, or `null`. The same seed and catch number always give the same answer. */
export function surpriseDropFor(draw: DropDraw): SurpriseDrop | null {
  if (fractionOf(`${draw.seed}/drop/${draw.catchNumber}`) >= SURPRISE_DROP_CHANCE) return null;
  return { pick: fractionOf(`${draw.seed}/pick/${draw.catchNumber}`) };
}
