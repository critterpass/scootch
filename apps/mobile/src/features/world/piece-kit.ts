import type { DrawCommand, Path } from '@scootch/art';

/** The inks the world is printed in. */
export interface WorldInks {
  readonly ground: string;
  readonly groundEdge: string;
  readonly ink: string;
  readonly tomato: string;
  readonly moss: string;
  readonly clay: string;
  readonly paper: string;
}

/** A dice roll from 0 up to 1 for each slot, fixed by the piece's seed. */
export type Roll = (slot: number) => number;

/** One kind of world piece, drawn in a 100 by 100 box with its foot on y = 92. */
export type PieceArt = (roll: Roll, inks: WorldInks) => DrawCommand[];

/** The side of the box a piece is drawn in, and the line it stands on. */
export const PIECE_BOX = 100;
export const PIECE_GROUND = 92;

/** The same seed and slot always roll the same number, on every phone. */
export function seedRoll(seed: string): Roll {
  return (slot) => {
    let hash = 0x811c9dc5;
    const text = `${seed}/${slot}`;
    for (let index = 0; index < text.length; index += 1) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
    }
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    return ((hash ^ (hash >>> 16)) >>> 0) / 2 ** 32;
  };
}

export const fill = (path: Path, color: string, alpha = 1): DrawCommand => ({
  op: 'fill',
  path,
  color,
  alpha,
  rule: 'nonzero',
});

export const stroke = (path: Path, color: string, width: number, alpha = 1): DrawCommand => ({
  op: 'stroke',
  path,
  color,
  alpha,
  width,
});

export const polygon = (points: readonly (readonly [number, number])[]): Path => [
  ...points.map(([x, y], index) => [index === 0 ? 'M' : 'L', x, y] as const),
  ['Z'],
];

/** A soft mound from `left` to `right` on the ground line, `height` tall at its top. */
export const mound = (left: number, right: number, height: number): Path => [
  ['M', left, PIECE_GROUND],
  ['Q', (left + right) / 2, PIECE_GROUND - height * 2, right, PIECE_GROUND],
  ['Z'],
];

/** The soft shadow every piece stands on. */
export const shadow = (centre: number, width: number, inks: WorldInks): DrawCommand =>
  fill(mound(centre - width / 2, centre + width / 2, 3), inks.ink, 0.1);

/** Draws a command list made for a `from`-sized box into a square at `x`, `y` of side `size`. */
export function placedIn(
  commands: readonly DrawCommand[],
  x: number,
  y: number,
  size: number,
  from: number,
): DrawCommand[] {
  const scale = size / from;
  return [
    { op: 'save' },
    { op: 'transform', matrix: [scale, 0, 0, scale, x, y] },
    ...commands,
    { op: 'restore' },
  ];
}
