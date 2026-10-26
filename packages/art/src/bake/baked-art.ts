import { VIEW_SIZE, type DrawCommand, type Path } from '../core/commands';

/** One image the system surfaces draw from the widget target's asset catalogue. */
export interface BakedArt {
  /** The image set's name, as Swift asks for it. */
  readonly name: string;
  /** Width and height in points; the PNGs are this at 1x, 2x and 3x. */
  readonly points: number;
  /** A glyph is one flat ink, so the system may tint it; a drawing in colour keeps its own. */
  readonly template: boolean;
  readonly commands: readonly DrawCommand[];
}

const GLYPH_POINTS = 24;
const GLYPH_INK = '#000000';

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
/** Every baked image, in a fixed order. */
export function bakedArt(): BakedArt[] {
  return [
    glyph('GlyphPlay', [PLAY]),
    glyph('GlyphPlus', PLUS, 22),
    {
      ...glyph('GlyphLock', [LOCK_BODY]),
      commands: [
        ...glyph('GlyphLock', [LOCK_BODY]).commands,
        ...glyph('GlyphLock', [LOCK_SHACKLE], 18).commands,
      ],
    },
  ];
}

export const BAKE_SCALES = [1, 2, 3] as const;
export { VIEW_SIZE as BAKE_VIEW_SIZE };
