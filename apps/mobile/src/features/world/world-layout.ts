import type { Id, MonsterRow, WorldPieceRow } from '@scootch/domain';

import { seedRoll } from './piece-kit';

/** The world's drawing space is this wide; it grows downwards one row at a time. */
export const WORLD_WIDTH = 360;
export const CELL = 72;
export const ROW_HEIGHT = 78;
const MIN_SIZE = 52;
const SIZE_SPREAD = 8;

/** Wide rows of five and narrow rows of four take turns. Each fills from its middle outwards. */
const WIDE = [2, 1, 3, 0, 4] as const;
const NARROW = [1, 2, 0, 3] as const;
const PER_PAIR = WIDE.length + NARROW.length;

/** One piece with its place. The box is a square of side `size`; `x` and `y` are its top left. */
export interface PlacedPiece {
  readonly id: Id;
  readonly kind: WorldPieceRow['kind'];
  readonly monsterId: Id | null;
  readonly seed: string;
  /** Which piece drawing it is: the name of a file in the pieces folder. */
  readonly art: string;
  readonly row: number;
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface WorldLayout {
  readonly placed: readonly PlacedPiece[];
  /** How many rows the world has. An empty world still has its one row of ground. */
  readonly rows: number;
  readonly height: number;
}

/**
 * The order pieces landed in: by day, then by the time of the catch, then by id. Later pieces only
 * ever come after, so adding one never moves another.
 */
export function inLandingOrder(
  pieces: readonly WorldPieceRow[],
  monsters: readonly Pick<MonsterRow, 'id' | 'caughtAt'>[] = [],
): WorldPieceRow[] {
  const caughtAt = new Map(monsters.map((monster) => [monster.id, monster.caughtAt ?? '']));
  const key = (piece: WorldPieceRow) =>
    `${piece.addedOn}/${(piece.monsterId && caughtAt.get(piece.monsterId)) || ''}/${piece.id}`;
  return [...pieces].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

/** A serious task's piece is always one of the quiet drawings, when the folder has them. */
const QUIET_ART: readonly string[] = ['shrub', 'hill'];

/**
 * Where every piece stands. The n-th piece to land takes the n-th plot, and its seed decides its
 * size, its drawing and where in the plot it stands, so the same pieces always give the same
 * world and no two ever overlap. Nothing here reads a date: the world shows what is there.
 */
export function layoutWorld(
  ordered: readonly WorldPieceRow[],
  artNames: readonly string[],
): WorldLayout {
  const names = [...artNames].sort();
  const quiet = names.filter((name) => QUIET_ART.includes(name));
  const placed = ordered.map((piece, index): PlacedPiece => {
    const roll = seedRoll(piece.seed);
    const inPair = index % PER_PAIR;
    const wide = inPair < WIDE.length;
    const row = Math.floor(index / PER_PAIR) * 2 + (wide ? 0 : 1);
    const column = wide ? (WIDE[inPair] ?? 0) : (NARROW[inPair - WIDE.length] ?? 0);
    const size = MIN_SIZE + roll(1) * SIZE_SPREAD;
    const choices = piece.kind === 'plain' && quiet.length > 0 ? quiet : names;
    return {
      id: piece.id,
      kind: piece.kind,
      monsterId: piece.monsterId,
      seed: piece.seed,
      art: choices[Math.floor(roll(2) * choices.length)] ?? '',
      row,
      x: (wide ? 0 : CELL / 2) + column * CELL + roll(3) * (CELL - size),
      y: row * ROW_HEIGHT + roll(4) * (ROW_HEIGHT - size),
      size,
    };
  });
  const rows = Math.max(1, (placed.at(-1)?.row ?? 0) + 1, placed.length > WIDE.length ? 2 : 1);
  return { placed, rows, height: rows * ROW_HEIGHT };
}
