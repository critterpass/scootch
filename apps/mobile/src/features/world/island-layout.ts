import type { Id, WorldPieceRow } from '@scootch/domain';

import { landmarkName, pieceKind } from './landmarks';
import { seedRoll } from './piece-kit';

/** The island is drawn in a square space this wide and tall, as the board draws it. */
export const ISLAND_SPACE = 200;

const CENTRE_X = 100;
const CENTRE_Y = 150;
/** Scootch's feet. He stands in the middle and everything else keeps clear of him. */
export const SCOOTCH_AT = { x: CENTRE_X, y: CENTRE_Y + 10 } as const;
/** Scootch is drawn half as big again as a monster. */
const SCOOTCH_BIGGER = 1.5;
/** A character's own drawing is about this tall, before the island scales it. */
const BODY_TALL = 96;
/** Half the width of Scootch with his arms out, and of the widest resident, at scale one. */
export const SCOOTCH_HALF = 62;
export const RESIDENT_HALF = 58;
/** The sand that always shows between Scootch and whoever stands nearest him. */
export const SCOOTCH_GAP = 3;

/**
 * How far from Scootch's middle a thing's foot must stand, sideways, so that nothing is ever
 * drawn across him: not behind him and not in front.
 */
export function keepOut(scale: number): number {
  return SCOOTCH_HALF * scale * SCOOTCH_BIGGER + RESIDENT_HALF * scale + SCOOTCH_GAP;
}

export type IslandItemKind = 'monster' | 'flag' | 'rocks' | 'house' | 'landmark';

/** One thing standing on the island. `x`, `y` is where its foot touches the ground. */
export interface IslandItem {
  readonly id: Id;
  readonly kind: IslandItemKind;
  readonly monsterId: Id | null;
  readonly seed: string;
  /** A landmark's drawing, by name. */
  readonly art: string | null;
  readonly x: number;
  readonly y: number;
  /** The scale its own 200 by 200 drawing is shown at. */
  readonly scale: number;
}

export interface IslandLayout {
  /** How many finished things live here: every piece but the landmarks. */
  readonly count: number;
  /** The scale of one monster at this stage: the island rescales as it fills. */
  readonly scale: number;
  readonly scootchScale: number;
  readonly ground: {
    readonly x: number;
    readonly y: number;
    readonly rx: number;
    readonly ry: number;
  };
  /** Everything on the island, from the back of it to the front. */
  readonly items: readonly IslandItem[];
}

/** The four sizes the island's residents are drawn at, by how many things live there. */
export function islandScale(count: number): number {
  if (count <= 1) return 0.34;
  if (count <= 8) return 0.24;
  if (count <= 24) return 0.17;
  return 0.13;
}

/** A quiet piece is a rock or a flag; a monster's home sometimes brings a flag, a rock or a house. */
function sceneryKind(roll: number): Exclude<IslandItemKind, 'monster' | 'landmark'> {
  if (roll < 0.42) return 'flag';
  if (roll < 0.74) return 'rocks';
  return 'house';
}

/**
 * Where everything stands, in the board's own arithmetic: one island that widens until it holds
 * forty things, a scale that steps down as it fills, and each thing placed inside the island's
 * ellipse by its own seed, kept out of a band as wide as Scootch and a resident together. The same pieces always
 * give the same island; nothing here reads a clock.
 */
export function layoutIsland(ordered: readonly WorldPieceRow[]): IslandLayout {
  const ordinary = ordered.filter((piece) => pieceKind(piece) !== 'landmark');
  const count = ordinary.length;
  const wide = Math.min(1, 0.5 + count / 40);
  const rx = 64 + wide * 32;
  const ry = 22 + wide * 14;
  const scale = islandScale(count);
  const clear = keepOut(scale);
  const centreY = CENTRE_Y + 8;
  // Beside Scootch the sand is only so deep: a thing moved out of his way stays on it.
  const deep = ry * 0.86 * Math.sqrt(Math.max(0, 1 - (clear / rx) ** 2));

  const spot = (seed: string, slot: number) => {
    const roll = seedRoll(seed);
    const angle = roll(slot) * Math.PI * 2;
    const reach = Math.sqrt(roll(slot + 1)) * 0.88;
    const x = CENTRE_X + Math.cos(angle) * rx * reach;
    const y = CENTRE_Y + 6 + Math.sin(angle) * ry * reach;
    if (Math.abs(x - CENTRE_X) >= clear) return { x, y };
    return {
      x: CENTRE_X + (x < CENTRE_X ? -clear : clear),
      y: centreY + Math.max(-deep, Math.min(deep, y - centreY)),
    };
  };

  // The only resident of a new island stands beside Scootch, with sand showing between them.
  const beside = { x: CENTRE_X + clear, y: CENTRE_Y + 6 };
  const items: IslandItem[] = [];
  for (const piece of ordinary) {
    const roll = seedRoll(piece.seed);
    const base = { monsterId: null, seed: piece.seed, art: null, scale };
    if (piece.kind === 'monster' && piece.monsterId) {
      const at = count === 1 ? beside : spot(piece.seed, 11);
      items.push({ ...base, ...at, id: piece.id, kind: 'monster', monsterId: piece.monsterId });
      // About one home in three brings something with it.
      if (count > 1 && roll(15) < 0.35) {
        const kind = sceneryKind(roll(16));
        items.push({ ...base, ...spot(piece.seed, 13), id: `${piece.id}/home`, kind });
      }
    } else {
      const kind = roll(16) < 0.5 ? 'rocks' : 'flag';
      const at = count === 1 ? beside : spot(piece.seed, 11);
      items.push({ ...base, ...at, id: piece.id, kind });
    }
  }

  // A landmark stands at the back of the island, where nothing else is placed, in landing order.
  const marks = ordered.filter((piece) => pieceKind(piece) === 'landmark');
  marks.forEach((piece, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const along = 0.5 + Math.floor(index / 2) * 0.2;
    items.push({
      id: piece.id,
      kind: 'landmark',
      monsterId: null,
      seed: piece.seed,
      art: landmarkName(piece),
      x: CENTRE_X + side * rx * along,
      y: CENTRE_Y + 8 - ry * Math.sqrt(1 - along * along) * 0.82,
      scale: Math.max(scale, 0.17),
    });
  });

  items.sort((a, b) => a.y - b.y || (a.id < b.id ? -1 : 1));
  return {
    count,
    scale,
    scootchScale: scale * SCOOTCH_BIGGER,
    ground: { x: CENTRE_X, y: CENTRE_Y + 8, rx, ry },
    items,
  };
}

/** What a tap can land on. */
export type IslandTarget =
  | { readonly kind: 'monster'; readonly item: IslandItem }
  | { readonly kind: 'landmark'; readonly item: IslandItem }
  | { readonly kind: 'scootch' };

export interface TapSpot {
  readonly target: IslandTarget;
  /** The middle of what is drawn, and how far from it a tap still counts. */
  readonly x: number;
  readonly y: number;
  readonly reach: number;
}

/** A landmark's box is this many units a side at scale one, with its foot near the bottom. */
export const LANDMARK_BOX = 190;

/**
 * Everything on the island that answers a tap: every monster, a landmark, and Scootch. A flag, a
 * rock and a house are scenery. `minReach` is half the smallest hit area, in island units, so a
 * thing drawn small is still as easy to press as a button.
 */
export function tapSpots(layout: IslandLayout, minReach: number): TapSpot[] {
  const spots: TapSpot[] = [
    {
      target: { kind: 'scootch' },
      x: SCOOTCH_AT.x,
      y: SCOOTCH_AT.y - (BODY_TALL * layout.scootchScale) / 2,
      reach: Math.max(minReach, SCOOTCH_HALF * layout.scootchScale),
    },
  ];
  for (const item of layout.items) {
    if (item.kind === 'monster') {
      spots.push({
        target: { kind: 'monster', item },
        x: item.x,
        y: item.y - (BODY_TALL * item.scale) / 2,
        reach: Math.max(minReach, RESIDENT_HALF * item.scale),
      });
    } else if (item.kind === 'landmark') {
      const tall = LANDMARK_BOX * item.scale * 0.7;
      spots.push({
        target: { kind: 'landmark', item },
        x: item.x,
        y: item.y - tall / 2,
        reach: Math.max(minReach, tall / 2),
      });
    }
  }
  return spots;
}

/**
 * What a tap at `x`, `y` (island units) lands on: the nearest thing whose hit area holds the
 * point, or nothing. On a crowded island many hit areas overlap, and the nearest one wins.
 */
export function hitIsland(spots: readonly TapSpot[], x: number, y: number): TapSpot | null {
  let best: TapSpot | null = null;
  let bestDistance = Infinity;
  for (const spot of spots) {
    const distance = Math.hypot(spot.x - x, spot.y - y);
    if (distance <= spot.reach && distance < bestDistance) {
      best = spot;
      bestDistance = distance;
    }
  }
  return best;
}
