/**
 * The classroom: one room seen through a camera rectangle (brief, section 5). It mirrors the Room
 * board's props: the camera, his mood and place, pacing, the chalkboard on or off the wall and its
 * text, the lamp, plus your desk's carvings. The `phone` composition is the App board's room.
 *
 * Drawing order, as on the boards: the back (walls, door, notice board, clock, banner, chalkboard,
 * window, fan, shelf, platform), Thầy Phú, the desks (and your paper on a phone), the carvings,
 * his thermos and papers, the chalk writing, and the lamp's dark. Moving layers: `clock.hand`,
 * `fan.blades`, `board.on`, `board.off`, `phu.place` (pacing), the whole of `phu`, `carvings`,
 * `chalk`, `lamp`.
 */
import {
  clampCamera,
  WORLD,
  type Camera,
  type Composition,
  type View,
  type Viewport,
} from './camera';
import { carvingsLayer, type Carving } from './carvings';
import { buildFigure, placed, type Figure, type Layer, type Piece } from './figure';
import { multiply, parseMarkup, scale, translate } from './markup';
import { buildPhu } from './phu';
import { phuPose, type PhuMood, type PhuPose } from './phu-moods';
import { buildProp, type PropName } from './props';
import {
  backLayer,
  chalkLayer,
  DESKS,
  lampLayer,
  LAMP_DEFS,
  type ChalkOptions,
} from './room-parts';
import { ROOM_SIGNATURE, ROOM_SIZE, ROOM_TEACHER_DESK } from './room-template';

export { ROOM_SIZE };

/** What fills the screen past the world's edges: the floor. */
export const ROOM_FLOOR = '#E8D2AE';

/** Where he stands, in room units (the top-left of his 230-unit box). */
export const PHU_SPOTS = {
  front: { x: 685, y: 196 },
  window: { x: 990, y: 345 },
} as const;
/** His size in the room. */
export const PHU_ROOM_SIZE = 230;

/** Where the boards put props in the room: top-left corner and width, in room units. */
export const PROP_SPOTS = {
  thermos: { x: 631, y: 328, size: 52 },
  papers: { x: 890, y: 382, size: 82 },
  bucket: { x: 1178, y: 546, size: 70 },
  bouquet: { x: 824, y: 318, size: 96 },
  candle: { x: 880, y: 334, size: 44 },
} as const satisfies Partial<Record<PropName, { x: number; y: number; size: number }>>;

export interface PlacedProp {
  readonly name: PropName;
  readonly x: number;
  readonly y: number;
  /** Width in room units. */
  readonly size: number;
}

export interface RoomOptions extends ChalkOptions {
  readonly viewport: Viewport;
  readonly camera: Camera;
  /** `wide` is the Room board, `phone` the App board's phone room. */
  readonly composition?: Composition;
  readonly mood?: PhuMood;
  /** A pose instead of a mood, for a blink or a pose made by hand. */
  readonly pose?: PhuPose;
  readonly phu?: { readonly x: number; readonly y: number };
  /** He paces the front of the room. */
  readonly pace?: boolean;
  /** Evening: the lamp is on and the room goes dark around it. */
  readonly lamp?: boolean;
  readonly carvings?: readonly Carving[];
  /** Props beyond his thermos and papers (the happenings). */
  readonly props?: readonly PlacedProp[];
  /** The class on the door plate. */
  readonly plate?: string;
  /** The banner over the board. */
  readonly banner?: string;
}

export interface Room {
  readonly figure: Figure;
  readonly camera: View;
  readonly background: string;
}

const FRONTS: Readonly<Record<Composition, Layer>> = {
  wide: buildFigure(
    { name: 'desks', ...ROOM_SIZE, label: '' },
    parseMarkup(ROOM_TEACHER_DESK + DESKS.wide),
  ).root,
  phone: buildFigure(
    { name: 'desks', ...ROOM_SIZE, label: '' },
    parseMarkup(ROOM_TEACHER_DESK + DESKS.phone),
  ).root,
};
const SIGNATURE: Layer = {
  ...buildFigure({ name: 'signature', ...ROOM_SIZE, label: '' }, parseMarkup(ROOM_SIGNATURE)).root,
  id: 'signature',
};
const LAMPS: Readonly<Record<Composition, Layer>> = {
  wide: lampLayer(WORLD.wide.floorTo),
  phone: lampLayer(WORLD.phone.floorTo),
};

/**
 * The last few of each part of the room, by what they were made from. The same words give back the
 * same layer object, so a renderer can skip every part that did not change: a new pose redraws
 * him, not the walls.
 */
function kept<T>(size = 6): (key: string, make: () => T) => T {
  const parts = new Map<string, T>();
  return (key, make) => {
    const hit = parts.get(key);
    if (hit !== undefined) {
      parts.delete(key);
      parts.set(key, hit);
      return hit;
    }
    const made = make();
    parts.set(key, made);
    const oldest = parts.keys().next();
    if (parts.size > size && !oldest.done) parts.delete(oldest.value);
    return made;
  };
}
const keptBack = kept<Layer>();
const keptPhu = kept<{ readonly layer: Layer; readonly defs: string }>();
const keptChalk = kept<Layer | undefined>();
const keptCarvings = kept<Layer>();
const keptProp = kept<{ readonly layer: Layer; readonly defs: string }>(12);

function propLayer(prop: PlacedProp, defs: string[]): Layer {
  const made = keptProp(JSON.stringify(prop), () => {
    const figure = buildProp(prop.name);
    return {
      defs: figure.defs,
      layer: placed(
        figure,
        `prop.${prop.name}`,
        multiply(translate(prop.x, prop.y), scale(prop.size / figure.width)),
      ),
    };
  });
  if (made.defs) defs.push(made.defs);
  return made.layer;
}

/**
 * Thầy Phú in his place, his 200-unit drawing scaled to his room size. `phu.place` moves in room
 * units (pacing), about the middle of his box; inside it, `phu.size` scales him.
 */
export function phuInRoom(
  pose: PhuPose,
  spot: { readonly x: number; readonly y: number },
  pace: 'pace' | 'paceWide' | undefined,
): Layer {
  const phu = buildPhu(pose);
  const k = PHU_ROOM_SIZE / phu.width;
  return {
    id: 'phu.place',
    pivot: [spot.x + PHU_ROOM_SIZE / 2, spot.y + (phu.height * k) / 2],
    ...(pace ? { motion: pace } : {}),
    pieces: [
      {
        kind: 'layer',
        layer: placed(phu, 'phu.size', multiply(translate(spot.x, spot.y), scale(k))),
      },
    ],
  };
}

/** The room for a camera and a moment. */
export function room(options: RoomOptions): Room {
  const composition = options.composition ?? 'wide';
  const pose = options.pose ?? phuPose(options.mood ?? 'over');
  const spot = options.phu ?? PHU_SPOTS.front;
  const pace = options.pace ? (composition === 'phone' ? 'paceWide' : 'pace') : undefined;
  const phu = keptPhu(JSON.stringify([pose, spot.x, spot.y, pace]), () => ({
    layer: phuInRoom(pose, spot, pace),
    defs: buildPhu(pose).defs,
  }));
  const defs: string[] = [phu.defs];
  const props: PlacedProp[] = [
    { name: 'thermos', ...PROP_SPOTS.thermos },
    { name: 'papers', ...PROP_SPOTS.papers },
    ...(options.props ?? []),
  ];
  const { lamp, board, plate, banner, chalk: lines, date, more, chalkTitle } = options;
  const chalk = keptChalk(JSON.stringify([board, lines, date, more, chalkTitle]), () =>
    chalkLayer(options),
  );
  const carvings = options.carvings ?? [];
  const layers: Layer[] = [
    keptBack(JSON.stringify([lamp, board, plate, banner, composition]), () =>
      backLayer(options, composition),
    ),
    phu.layer,
    FRONTS[composition],
    keptCarvings(JSON.stringify(carvings), () => carvingsLayer(carvings)),
    // On the App board the desk beside yours is drawn over the studio's carving.
    ...(composition === 'wide' ? [SIGNATURE] : []),
    ...props.map((p) => propLayer(p, defs)),
    ...(chalk ? [chalk] : []),
    ...(options.lamp ? [LAMPS[composition]] : []),
  ];
  return {
    figure: {
      name: 'room',
      width: ROOM_SIZE.width,
      height: WORLD[composition].height,
      label: pose.label,
      defs: defs.join('') + (options.lamp ? LAMP_DEFS : ''),
      root: { id: 'room', pieces: layers.map((layer): Piece => ({ kind: 'layer', layer })) },
    },
    camera: clampCamera(options.camera, options.viewport, composition),
    background: ROOM_FLOOR,
  };
}
