import { toSvg } from '@scootch/art';

import { artFrame, type ArtSpec, type BodyType, type ScootchMood, type WorkMode } from './art-spec';

export type { BodyType };

/** A character as the page first shows it: its still as inline SVG, and what it takes to move it. */
export interface Art {
  readonly svg: string;
  readonly spec: ArtSpec;
}

export interface ScootchDrawing {
  /** What he is working at. Only the `working` mood shows it. */
  readonly work?: WorkMode;
  /** The pale Scootch who sits at someone else's seat. */
  readonly paper?: boolean;
  /** On a night section the marks around him turn light. */
  readonly night?: boolean;
}

let drawn = 0;

/** Draws a character's still. Every drawing gets ids of its own. */
function still(spec: ArtSpec): Art {
  return { svg: toSvg(artFrame(spec, null).commands, { idPrefix: `a${drawn++}-` }), spec };
}

/** One monster, drawn by the same generator as the app. */
export function monsterArt(body: BodyType, seed: string): Art {
  return still({ k: 'monster', body, seed });
}

/** Scootch in one mood. */
export function scootchArt(mood: ScootchMood, drawing: ScootchDrawing = {}): Art {
  return still({ k: 'scootch', mood, ...drawing });
}

/** Scootch's still alone, where nothing moves: the pages of shared things, the link preview. */
export function scootchSvg(mood: ScootchMood): string {
  return scootchArt(mood).svg;
}

/**
 * The home page's strip of example monsters: a fixed, hand-checked set, never live data. Each
 * pairs with the name and card line at the same index of the site copy's `strip.monsters`.
 */
export const stripMonsters: readonly { readonly bodyType: BodyType; readonly seed: string }[] = [
  { bodyType: 'envelope', seed: 'inbox' },
  { bodyType: 'receipt', seed: 'receipt' },
  { bodyType: 'slime', seed: 'grout' },
  { bodyType: 'phone', seed: 'mum' },
  { bodyType: 'sock', seed: 'gym' },
  { bodyType: 'weed', seed: 'fern' },
];

/** The caught monsters that stand in a row wherever a shelf is drawn. */
export const shelfMonsters: readonly { readonly bodyType: BodyType; readonly seed: string }[] = [
  { bodyType: 'tooth', seed: 'dentist' },
  { bodyType: 'box', seed: 'parcel' },
  { bodyType: 'note', seed: 'form' },
  { bodyType: 'pot', seed: 'sink' },
  { bodyType: 'clock', seed: 'later' },
];
