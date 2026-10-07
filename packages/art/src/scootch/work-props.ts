import { ell, rr, type Point } from '../core/geometry';
import { INK, type Pen } from '../core/pen';
import { SCOOTCH } from './palette';
import { phase, type ScootchFrame } from './work-mode-kit';

/** The colours of the things Scootch works with. */
export const PAL = {
  paper: '#FBF8F2',
  grey: '#D6CDBF',
  stone: '#B8AC97',
  tan: '#D9B98C',
  dark: '#3A3430',
  water: '#8EBBDA',
  leaf: '#78A57F',
  gold: '#F2C46B',
  rule: '#B5AEA4',
  crease: '#C9C1B4',
  card: '#CDB48B',
  cardShade: '#B89A6C',
} as const;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** A thin drawn line around a shape. */
export function outline(
  pen: Pen,
  pts: readonly Point[],
  width = 1.6,
  color = INK,
  alpha = 1,
): void {
  const [first, second] = pts;
  if (!first || !second) return;
  pen.line([...pts, first, second], width, color, 0.2, clamp01(alpha));
}

/** A filled shape with a drawn line around it. */
export function filled(
  pen: Pen,
  pts: readonly Point[],
  color: string,
  width = 1.6,
  alpha = 1,
): void {
  pen.fill(pts, color, 0.25, clamp01(alpha));
  outline(pen, pts, width, INK, alpha);
}

const BERET = '#2C2724';

/** A beret, pulled down over one side of the head. */
export function beret(pen: Pen, g: ScootchFrame): void {
  const x = g.cx - 8;
  const y = g.cy - g.ry + 3;
  pen.riso(ell(x, y, 32, 11, 18, 0.05, 0, -0.2), BERET, '#171412', [x, y], 70, 60, {
    offset: 4,
    grains: 50,
  });
  pen.blot(x + 4, y - 11, 3.4, BERET);
}

export function desk(pen: Pen, g: ScootchFrame, halfWidth = 76): void {
  pen.line(
    [
      [g.cx - halfWidth, g.by],
      [g.cx + halfWidth, g.by],
    ],
    2.6,
    INK,
    0.2,
  );
}

/** The desk and a laptop seen from behind; `mark` replaces the dot on its lid. */
export function laptop(pen: Pen, g: ScootchFrame, lid: string = PAL.grey, mark?: () => void): void {
  desk(pen, g);
  pen.fill(
    [
      [g.cx - 26, g.by - 2],
      [g.cx + 26, g.by - 2],
      [g.cx + 22, g.by - 19],
      [g.cx - 22, g.by - 19],
    ],
    lid,
    0.3,
  );
  if (mark) mark();
  else pen.blot(g.cx + 5, g.by - 11, 2.8, SCOOTCH.body);
}

export function bubble(pen: Pen, x: number, y: number, r: number, alpha = 1): void {
  const a = clamp01(alpha);
  const pts = ell(x, y, r, r, 12);
  pen.fill(pts, '#FFFFFF', 0.15, 0.9 * a);
  outline(pen, pts, 1.2, INK, 0.4 * a);
  pen.blot(x - r * 0.35, y - r * 0.35, r * 0.22, '#FFFFFF', 0.05, a);
}

export function heart(x: number, y: number, size: number): Point[] {
  return Array.from({ length: 16 }, (_, i): Point => {
    const a = (i / 16) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(a), 3);
    const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    return [x + hx * size, y + hy * size];
  });
}

/** Round glasses over both eyes. */
export function glasses(pen: Pen, g: ScootchFrame): void {
  for (const side of [-1, 1]) {
    outline(pen, ell(g.faceX + side * g.eyeGap, g.eyeY, 15, 15, 16), 2.4);
  }
  pen.line(
    [
      [g.faceX - g.eyeGap + 15, g.eyeY - 2],
      [g.faceX, g.eyeY - 5],
      [g.faceX + g.eyeGap - 15, g.eyeY - 2],
    ],
    2.4,
    INK,
    0.15,
  );
}

/** Wisps of steam rising from a point; `at` is where their loop stands, 0 to 1. */
export function steam(pen: Pen, x: number, y: number, wisps: number, at: number): void {
  for (let i = 0; i < wisps; i++) {
    const k = phase(at, i / wisps);
    const left = x + i * 7 - 7;
    const rise = y - k * 22;
    pen.line(
      [
        [left, rise],
        [left + 3, rise - 6],
        [left, rise - 12],
        [left + 3, rise - 18],
      ],
      1.8,
      '#9A9084',
      0.2,
      (1 - k) * 0.8,
    );
  }
}

/** A mug with a handle, standing on `y`. */
export function mug(pen: Pen, x: number, y: number): void {
  filled(pen, rr(x - 9, y - 18, 18, 18, 3), PAL.paper);
  pen.line(
    [
      [x + 9, y - 14],
      [x + 14, y - 11],
      [x + 9, y - 6],
    ],
    1.8,
    INK,
    0.1,
  );
}
