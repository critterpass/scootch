import type { MonsterBody } from '../core/body';
import type { Point } from '../core/geometry';
import { hash } from '../core/rng';

/** A paint splat with coloured flecks and two runs dripping off it. */
export const splat: MonsterBody = {
  width: 94,
  height: 80,
  legs: 'none',
  tops: true,
  faceWidth: 0.65,
  outline(g) {
    const pts: Point[] = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const k = 0.78 + hash(g.seed + i * 7) * 0.4 + (i % 5 === 0 ? 0.18 : 0);
      pts.push([
        g.cx + ((Math.cos(a) * g.w) / 2) * k,
        g.y0 + g.h / 2 + ((Math.sin(a) * g.h) / 2) * k * (Math.sin(a) > 0 ? 0.85 : 1),
      ]);
    }
    return pts;
  },
  face: (g) => [g.cx, g.y0 + g.h * 0.46],
  deco(pen, g, ink) {
    ['#F2C46B', '#8EBBDA', '#78A57F', '#FBF8F2'].forEach((color, i) =>
      pen.blot(
        g.cx + (hash(g.seed + i * 3) - 0.5) * g.w * 0.9,
        g.y0 + g.h * (0.62 + hash(g.seed + i * 5) * 0.3),
        3 + hash(g.seed + i) * 3,
        color,
        0.2,
      ),
    );
    for (let i = 0; i < 2; i++) {
      const x = g.cx - 20 + i * 34;
      const length = 6 + (Math.sin(g.t * 1.5 + i) + 1) * 5;
      pen.line(
        [
          [x, g.y1 - 6],
          [x, g.y1 - 6 + length],
        ],
        5,
        ink.body,
      );
      pen.blot(x, g.y1 - 6 + length, 3.4, ink.body);
    }
  },
};
