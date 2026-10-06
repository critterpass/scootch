import type { Attitude, ScootchMood } from '@scootch/domain';

import { VIEW_SIZE, type DrawCommand, type Path } from '../core/commands';
import { buildScootch } from '../scootch/build-scootch';

/** One image the system surfaces draw from the widget target's asset catalogue. */
export interface BakedArt {
  /** The image set's name, as Swift asks for it. */
  readonly name: string;
  /** Width and height in points; the PNGs are this at 1x, 2x and 3x. */
  readonly points: number;
  /** A glyph is one flat ink, so the system may tint it; a pose keeps its own colours. */
  readonly template: boolean;
  readonly commands: readonly DrawCommand[];
}

const POSE_POINTS = 96;
const GLYPH_POINTS = 24;
const GLYPH_INK = '#000000';

const ATTITUDES: readonly Attitude[] = ['soft', 'cheeky', 'unhinged'];

/** The poses the surfaces show, each at every attitude: the acting is larger as it gets louder. */
const ACTED_POSES: readonly { readonly pose: string; readonly mood: ScootchMood }[] = [
  { pose: 'Working', mood: 'working' },
  { pose: 'Waiting', mood: 'waiting' },
  { pose: 'Asleep', mood: 'asleep' },
  { pose: 'Celebrating', mood: 'celebrating' },
];

const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

function pose(name: string, mood: ScootchMood, attitude: Attitude): BakedArt {
  return {
    name,
    points: POSE_POINTS,
    template: false,
    // The still form of the mood: a widget cannot animate it.
    commands: buildScootch({ mood, attitude, workMode: null, reducedMotion: true }),
  };
}

function glyph(name: string, paths: readonly Path[], stroke?: number): BakedArt {
  return {
    name,
    points: GLYPH_POINTS,
    template: true,
    commands: paths.map((path) =>
      stroke === undefined
        ? { op: 'fill', path, color: GLYPH_INK, alpha: 1, rule: 'nonzero' }
        : { op: 'stroke', path, color: GLYPH_INK, alpha: 1, width: stroke },
    ),
  };
}

// Glyphs are drawn in the same 200 by 200 space as everything else.
const PLAY: Path = [['M', 62, 40], ['L', 158, 100], ['L', 62, 160], ['Z']];
const PLUS: readonly Path[] = [
  [
    ['M', 100, 44],
    ['L', 100, 156],
  ],
  [
    ['M', 44, 100],
    ['L', 156, 100],
  ],
];
const LOCK_BODY: Path = [['M', 48, 92], ['L', 152, 92], ['L', 152, 170], ['L', 48, 170], ['Z']];
const LOCK_SHACKLE: Path = [
  ['M', 70, 92],
  ['L', 70, 66],
  ['Q', 70, 34, 100, 34],
  ['Q', 130, 34, 130, 66],
  ['L', 130, 92],
];
const WORLD_GROUND: Path = [
  ['M', 20, 150],
  ['Q', 100, 118, 180, 150],
  ['Q', 100, 182, 20, 150],
  ['Z'],
];
const WORLD_BLOB: Path = [['O', 82, 118, 30]];
const WORLD_FLAG: Path = [['M', 132, 136], ['L', 132, 60], ['L', 168, 76], ['L', 132, 92], ['Z']];

/** Every baked image, in a fixed order. The serious pose takes no attitude. */
export function bakedArt(): BakedArt[] {
  const poses = ACTED_POSES.flatMap(({ pose: name, mood }) =>
    ATTITUDES.map((attitude) => pose(`Scootch${name}${title(attitude)}`, mood, attitude)),
  );
  return [
    ...poses,
    pose('ScootchSerious', 'serious', 'soft'),
    glyph('GlyphPlay', [PLAY]),
    glyph('GlyphPlus', PLUS, 22),
    {
      ...glyph('GlyphLock', [LOCK_BODY]),
      commands: [
        ...glyph('GlyphLock', [LOCK_BODY]).commands,
        ...glyph('GlyphLock', [LOCK_SHACKLE], 18).commands,
      ],
    },
    glyph('GlyphWorld', [WORLD_GROUND, WORLD_BLOB, WORLD_FLAG]),
  ];
}

export const BAKE_SCALES = [1, 2, 3] as const;
export { VIEW_SIZE as BAKE_VIEW_SIZE };
