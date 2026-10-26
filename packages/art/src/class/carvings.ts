/**
 * Your desk remembers (brief, section 5): every finish carves one small doodle into your desk, and
 * the desk never loses a mark. Carvings are a list in the order they were made; mark n always sits
 * in spot n, so adding one never moves another. Your desk is the middle one of the front row.
 *
 * The star, the heart, the initials and the little mark are the Room board's; the tiny Thầy Phú
 * is the App board's. The rare carved "10" and the gold star sticker have no board yet.
 */
import type { Layer, Piece } from './figure';
import { multiply, rotate, translate } from './markup';

export const CARVING_KINDS = [
  'initials',
  'star',
  'heart',
  'phu',
  'mark',
  'ten',
  'goldStar',
] as const;
export type CarvingKind = (typeof CARVING_KINDS)[number];
/** Left by rare finishes only. */
export const RARE_CARVINGS: readonly CarvingKind[] = ['ten', 'goldStar'];

export interface Carving {
  readonly kind: CarvingKind;
  /** The letters, for initials. */
  readonly text?: string;
}

/** Your desk's top, in room units: the front row's middle desk. */
export const YOUR_DESK = { x: 683, y: 890, width: 234, top: 30, inset: 12 } as const;

const INK = '#A9733F';
const CUT = `fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;

/** Each doodle about its own origin: the left end of its baseline. */
const SHAPES: Readonly<Record<Exclude<CarvingKind, 'initials' | 'ten'>, string>> = {
  star: `<path d="M0 0 l3 -6 l3 6 l-7 -4 h8 z" ${CUT}></path>`,
  heart: `<path d="M4 -4 q-4 -6 1 -7 q3 0 3 3 q0 -3 3 -3 q5 1 1 7 l-4 4 z" ${CUT}></path>`,
  mark: `<path d="M0 0 l6 -9 M3 -5 h6" ${CUT}></path>`,
  phu: `<circle cx="6" cy="-6" r="6" ${CUT}></circle><path d="M3 -6 h6" ${CUT}></path>`,
  goldStar: `<path d="M6.65 -12.6 l2.1 4.2 l4.55 .7 l-3.15 3.15 l.7 4.55 l-4.2 -2.1 l-4.2 2.1 l.7 -4.55 l-3.15 -3.15 l4.55 -.7 z" fill="#FFC93C" stroke="#E0A030" stroke-width="1" stroke-linejoin="round"></path>`,
};

/**
 * Spots on the desk top: the two ends first, working inward (on a phone your paper and pen lie in
 * the middle), then between the rows, then over the old marks.
 */
const COLUMNS = 9;
const COLUMN_ORDER = [0, 8, 1, 7, 2, 6, 3, 5, 4] as const;
const BETWEEN_ORDER = [0, 7, 1, 6, 2, 5, 3, 4] as const;
const STEP = 22;
const LEFT = 702;
const ROWS = [874, 888] as const;
const BETWEEN = 881;
const TILT = [-5, 3, -2, 6, -4, 2, 5, -6, 0] as const;
const DRIFT = [
  [4, -3],
  [-3, 2],
  [6, 1],
  [-5, -2],
  [2, 3],
] as const;

export interface CarvingSpot {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}

/** Where mark `index` is carved. The same index is always the same spot. */
export function carvingSpot(index: number): CarvingSpot {
  const firstPass = COLUMNS * ROWS.length;
  const secondPass = COLUMNS - 1;
  const angle = TILT[index % TILT.length] ?? 0;
  if (index < firstPass) {
    const column = COLUMN_ORDER[Math.floor(index / ROWS.length)] ?? 0;
    return { x: LEFT + column * STEP, y: ROWS[index % ROWS.length] ?? ROWS[0], angle };
  }
  if (index < firstPass + secondPass) {
    const column = BETWEEN_ORDER[index - firstPass] ?? 0;
    return { x: LEFT + STEP / 2 + column * STEP, y: BETWEEN, angle };
  }
  // A full desk keeps taking marks: they land over the old ones, a little off, as on a real desk.
  const rest = index - firstPass - secondPass;
  const base = carvingSpot(rest % (firstPass + secondPass));
  const [dx, dy] = DRIFT[Math.floor(rest / (firstPass + secondPass)) % DRIFT.length] ?? [0, 0];
  return { x: base.x + dx, y: base.y + dy * 0.5, angle: -base.angle };
}

/** A new list with one more mark. Nothing is ever removed or reordered. */
export function addCarving(list: readonly Carving[], carving: Carving): readonly Carving[] {
  if (carving.kind === 'initials' && !carving.text?.trim()) {
    throw new Error('Initials need their letters');
  }
  return [...list, carving];
}

function carvingPieces(carving: Carving): Piece[] {
  if (carving.kind === 'initials' || carving.kind === 'ten') {
    const ten = carving.kind === 'ten';
    return [
      {
        kind: 'text',
        item: {
          text: ten ? '10' : (carving.text ?? '').trim(),
          x: 0,
          y: 0,
          size: ten ? 14 : 11,
          weight: 700,
          font: 'hand',
          color: INK,
          opacity: 1,
          anchor: 'start',
          letterSpacing: 0,
        },
      },
    ];
  }
  return [{ kind: 'svg', markup: SHAPES[carving.kind] }];
}

/** Every mark on your desk, in room units, oldest first. */
export function carvingsLayer(list: readonly Carving[]): Layer {
  return {
    id: 'carvings',
    pieces: list.map((carving, index): Piece => {
      const spot = carvingSpot(index);
      const matrix = multiply(translate(spot.x, spot.y), rotate(spot.angle));
      return {
        kind: 'layer',
        layer: { id: `carving.${index + 1}`, matrix, pieces: carvingPieces(carving) },
      };
    }),
  };
}
