import type { DrawCommand, Path } from './commands';
import { circle, closedPath, ell, openPath, polygonPath, type Point } from './geometry';
import { hash } from './rng';

export const INK = '#1C1A17';
export const WHITE = '#FFFCF7';

/**
 * Which of the three stroke sets a drawing is made with. The design redraws every line four times
 * a second with a slightly different wobble, so a character never sits perfectly still on the
 * page; frame 0 is the still.
 */
export type BoilFrame = 0 | 1 | 2;
export const BOIL_FRAMES = 3;
export const BOIL_PER_SECOND = 4;
/** The most a point of a wobbled shape moves from where it was asked to be, on either axis. */
export const MAX_JITTER = 0.38;

/** The stroke set showing `t` seconds in. Zero at zero. */
export function boilFrame(t: number): BoilFrame {
  'worklet';
  const frame = Math.floor(Math.max(0, t) * BOIL_PER_SECOND) % BOIL_FRAMES;
  return frame === 1 ? 1 : frame === 2 ? 2 : 0;
}

/**
 * Collects drawing commands. Every shape gets a slight seeded wobble, so outlines look drawn by
 * hand and no two seeds give the same line. The boil frame picks one of three wobbles of the same
 * drawing; the grain of a printed body does not boil.
 */
export class Pen {
  readonly commands: DrawCommand[] = [];
  private strokes = 0;

  constructor(
    private readonly seed: number,
    private readonly boil: BoilFrame = 0,
  ) {}

  private jitter(pts: readonly Point[], amount: number): Point[] {
    this.strokes++;
    const base = this.boil * 7919 + this.strokes * 104729 + this.seed;
    const r = (i: number): number => hash(base + i * 31);
    return pts.map((p, i) => [
      p[0] + (r(i * 2) - 0.5) * 2 * amount,
      p[1] + (r(i * 2 + 1) - 0.5) * 2 * amount,
    ]);
  }

  /** A soft closed shape. */
  fill(pts: readonly Point[], color: string, jitter = 0.38, alpha = 1): void {
    const path = closedPath(this.jitter(pts, jitter));
    this.commands.push({ op: 'fill', path, color, alpha, rule: 'nonzero' });
  }

  /** A closed shape with straight edges and no wobble. */
  polygon(pts: readonly Point[], color: string): void {
    this.commands.push({ op: 'fill', path: polygonPath(pts), color, alpha: 1, rule: 'nonzero' });
  }

  line(pts: readonly Point[], width = 2.8, color = INK, jitter = 0.38, alpha = 1): void {
    const path = openPath(this.jitter(pts, jitter));
    this.commands.push({ op: 'stroke', path, color, alpha, width });
  }

  blot(x: number, y: number, r: number, color: string, jitter = 0.12, alpha = 1): void {
    this.fill(ell(x, y, r, r, 10), color, jitter, alpha);
  }

  /** Runs `draw` clipped to a path. */
  clipped(path: Path, draw: () => void): void {
    this.commands.push({ op: 'save' }, { op: 'clip', path });
    draw();
    this.commands.push({ op: 'restore' });
  }

  /**
   * The print look of a body: flat ink, a darker crescent along the lower right as if a second
   * colour was printed slightly off, and grain.
   */
  riso(
    pts: readonly Point[],
    color: string,
    shade: string,
    centre: Point,
    grainWidth: number,
    grainHeight: number,
    print: { readonly offset?: number; readonly grains?: number } = {},
  ): void {
    const offset = print.offset ?? 8;
    const grains = print.grains ?? 90;
    const outline = this.jitter(pts, 0.38);
    const path = closedPath(outline);
    this.commands.push({ op: 'fill', path, color, alpha: 1, rule: 'nonzero' });
    this.clipped(path, () => {
      const shifted = closedPath(outline.map((p): Point => [p[0] - offset, p[1] - offset * 1.1]));
      this.commands.push({
        op: 'fill',
        path: [...path, ...shifted],
        color: shade,
        alpha: 0.9,
        rule: 'evenodd',
      });
      const dots: Path = Array.from({ length: grains }, (_, i) =>
        circle(
          centre[0] + (hash(this.seed + i * 3) - 0.25) * grainWidth,
          centre[1] + (hash(this.seed + i * 3 + 1) - 0.2) * grainHeight,
          0.55 + hash(i + 9) * 0.5,
        ),
      );
      this.commands.push({ op: 'fill', path: dots, color: shade, alpha: 0.55, rule: 'nonzero' });
    });
  }
}
