import { boxArea, boxCentre, type Box, type FoundThing } from './things';

/** A room is read as four corners of the photo, lettered as they are drawn. */
export const ZONE_LETTERS = ['A', 'B', 'C', 'D'] as const;
export type ZoneLetter = (typeof ZONE_LETTERS)[number];

export interface RoomZone {
  readonly letter: ZoneLetter;
  readonly box: Box;
  /** The things whose centre sits in this corner. */
  readonly things: readonly FoundThing[];
}

const ZONE_BOXES: Readonly<Record<ZoneLetter, Box>> = {
  A: [0, 0, 0.5, 0.5],
  B: [0.5, 0, 0.5, 0.5],
  C: [0, 0.5, 0.5, 0.5],
  D: [0.5, 0.5, 0.5, 0.5],
};

function zoneOf(thing: FoundThing): ZoneLetter {
  const [x, y] = boxCentre(thing.box);
  if (y < 0.5) return x < 0.5 ? 'A' : 'B';
  return x < 0.5 ? 'C' : 'D';
}

function covered(zone: RoomZone): number {
  return zone.things.reduce((sum, thing) => sum + boxArea(thing.box), 0);
}

export type RoomRead =
  | { readonly kind: 'nothing' }
  | {
      readonly kind: 'step';
      /** All four corners, A to D, for drawing. */
      readonly zones: readonly RoomZone[];
      /** The corners with something in them, smallest job first. The first is the one to hand over. */
      readonly order: readonly ZoneLetter[];
    };

/**
 * A big mess, split into four corners, smallest first: the corner with the fewest things in it,
 * then the one they cover least of, then the earlier letter. An empty corner is no job and is
 * never offered. "Bigger zone" walks `order` with {@link biggerZone}.
 */
export function readRoom(things: readonly FoundThing[]): RoomRead {
  const zones = ZONE_LETTERS.map((letter): RoomZone => ({
    letter,
    box: ZONE_BOXES[letter],
    things: things.filter((thing) => zoneOf(thing) === letter),
  }));
  const order = zones
    .filter((zone) => zone.things.length > 0)
    .sort(
      (a, b) =>
        a.things.length - b.things.length ||
        covered(a) - covered(b) ||
        ZONE_LETTERS.indexOf(a.letter) - ZONE_LETTERS.indexOf(b.letter),
    )
    .map((zone) => zone.letter);
  return order.length === 0 ? { kind: 'nothing' } : { kind: 'step', zones, order };
}

/** The next corner up from `current`, or `null` when it is already the biggest job in the room. */
export function biggerZone(order: readonly ZoneLetter[], current: ZoneLetter): ZoneLetter | null {
  const at = order.indexOf(current);
  return at === -1 ? null : (order[at + 1] ?? null);
}
