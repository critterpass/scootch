/**
 * The drawing model: a monster is a flat list of these commands, in a 200 by 200 unit space with
 * the ground at y = 172. A backend (2D canvas, SVG, Skia) only has to replay the list.
 */
export type PathSegment =
  | readonly ['M', number, number]
  | readonly ['L', number, number]
  | readonly ['Q', number, number, number, number]
  /** A full circle as its own closed subpath: centre x, centre y, radius. */
  | readonly ['O', number, number, number]
  | readonly ['Z'];

export type Path = readonly PathSegment[];
export type FillRule = 'nonzero' | 'evenodd';
/** The six numbers of a 2D affine matrix, in canvas order (a, b, c, d, e, f). */
export type Matrix = readonly [number, number, number, number, number, number];

export type DrawCommand =
  | { readonly op: 'save' }
  | { readonly op: 'restore' }
  | { readonly op: 'transform'; readonly matrix: Matrix }
  /** Clips everything until the matching restore. */
  | { readonly op: 'clip'; readonly path: Path }
  | {
      readonly op: 'fill';
      readonly path: Path;
      readonly color: string;
      readonly alpha: number;
      readonly rule: FillRule;
    }
  /** Strokes always have round caps and round joins. */
  | {
      readonly op: 'stroke';
      readonly path: Path;
      readonly color: string;
      readonly alpha: number;
      readonly width: number;
    };

/** Width and height of the drawing space. */
export const VIEW_SIZE = 200;
/** The y of the ground line monsters stand on. */
export const GROUND_Y = 172;
