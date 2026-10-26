import { buildPhu, phuPose, PRESSURE_MOODS, type PhuMood } from '../class/phu';
import { PHU_SIZE } from '../class/phu-template';
import { buildProp, type PropName } from '../class/props';
import { toSvg } from '../class/figure';
import { VIEW_SIZE, type DrawCommand, type Path } from '../core/commands';

/** A flat glyph the system may tint, drawn from the package's own commands. */
export interface BakedGlyph {
  readonly kind?: 'glyph';
  /** The image set's name, as Swift asks for it. */
  readonly name: string;
  /** Width and height in points; the PNGs are this at 1x, 2x and 3x. */
  readonly points: number;
  /** A glyph is one flat ink, so the system may tint it; a drawing in colour keeps its own. */
  readonly template: boolean;
  readonly commands: readonly DrawCommand[];
}

/** One look of a drawing: an SVG document, and a soft light edge drawn around it, if any. */
export interface DrawingLook {
  readonly svg: string;
  /** A colour glowing just outside his outline, so dark ink still reads on a dark ground. */
  readonly glow?: string;
}

/** A drawing in colour from the classroom's board markup, in light and, if it differs, dark. */
export interface BakedDrawing {
  readonly kind: 'drawing';
  readonly name: string;
  /** Width and height in points. */
  readonly width: number;
  readonly height: number;
  readonly light: DrawingLook;
  /** Left out, the light look serves both appearances. */
  readonly dark?: DrawingLook;
}

/** One image the system surfaces draw from an asset catalogue. */
export type BakedArt = BakedGlyph | BakedDrawing;

export const isDrawing = (art: BakedArt): art is BakedDrawing => art.kind === 'drawing';

const GLYPH_POINTS = 24;
const GLYPH_INK = '#000000';

function glyph(name: string, paths: readonly Path[], stroke?: number): BakedGlyph {
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

function glyphs(): BakedGlyph[] {
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

/**
 * The moods the surfaces show him in: the pressure ladder (0 to 5, the last is the glare), the
 * two frames of his pacing in a period (grading, then his watch), asleep for the night, quiet for
 * a serious task, and approving at a finish.
 */
export const SURFACE_MOODS = [
  ...PRESSURE_MOODS,
  'grading',
  'watch',
  'sleep',
  'serious',
  'approve',
] as const satisfies readonly PhuMood[];

/** `calm` as Swift names it: `Calm`. */
const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** The pressure ladder as the image names spell it, step 0 first. */
export const PRESSURE_MOOD_NAMES: readonly string[] = PRESSURE_MOODS.map(title);

/** His head and shoulders, in his 200 by 220 space, roomy enough for the puff at pressure 4. */
export const FACE_REGION = { x: 34, y: 6, w: 132, h: 132 } as const;

/** Points: a face is drawn up to about 56 points across; a figure up to about 170 wide. */
const FACE_POINTS = 64;
const FIGURE_POINTS = 140;

/** Just outside his outline on a dark ground: the chalk of the room's own paper. */
const DARK_GLOW = '#FFF1DC';

/** The SVG document re-cut to show only `region` of it. */
export function cropSvg(
  svg: string,
  region: { readonly x: number; readonly y: number; readonly w: number; readonly h: number },
): string {
  return svg.replace(
    /^<svg [^>]*>/,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${region.w}" height="${region.h}" viewBox="${region.x} ${region.y} ${region.w} ${region.h}">`,
  );
}

function phuSvg(mood: PhuMood): string {
  return toSvg(buildPhu(phuPose(mood)));
}

function face(mood: PhuMood): BakedDrawing {
  const svg = cropSvg(phuSvg(mood), FACE_REGION);
  return {
    kind: 'drawing',
    name: `PhuFace${title(mood)}`,
    width: FACE_POINTS,
    height: FACE_POINTS,
    light: { svg },
    dark: { svg, glow: DARK_GLOW },
  };
}

function figure(mood: PhuMood, dark = true): BakedDrawing {
  const svg = phuSvg(mood);
  return {
    kind: 'drawing',
    name: `PhuFigure${title(mood)}`,
    width: FIGURE_POINTS,
    height: Math.round((FIGURE_POINTS * PHU_SIZE.height) / PHU_SIZE.width),
    light: { svg },
    ...(dark ? { dark: { svg, glow: DARK_GLOW } } : {}),
  };
}

function prop(name: PropName, points: number): BakedDrawing {
  const built = buildProp(name);
  return {
    kind: 'drawing',
    name: `Prop${title(name)}`,
    width: points,
    height: Math.round((points * built.height) / built.width),
    light: { svg: toSvg(built) },
  };
}

/** Every image of the widget target's catalogue, in a fixed order. */
export function bakedArt(): BakedArt[] {
  return [
    ...glyphs(),
    ...SURFACE_MOODS.map((mood) => face(mood)),
    ...SURFACE_MOODS.map((mood) => figure(mood)),
    prop('thermos', 40),
    prop('drum', 32),
  ];
}

/**
 * The notification service extension's catalogue: his figure at each pressure step, for a note
 * home. A notification's picture has one look.
 */
export function notificationArt(): BakedArt[] {
  return PRESSURE_MOODS.map((mood) => figure(mood, false));
}

export const BAKE_SCALES = [1, 2, 3] as const;
export { VIEW_SIZE as BAKE_VIEW_SIZE };
