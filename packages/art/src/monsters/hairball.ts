import type { MonsterBody } from '../core/body';
import type { Point } from '../core/geometry';
import { INK, WHITE } from '../core/pen';
import { hash } from '../core/rng';

/** A furry ball with two ears and whiskers. */
export const hairball: MonsterBody = {
  width: 90,
  height: 76,
  legs: 'stub',
  tops: false,
  faceWidth: 0.7,
  inks: ['charcoal', 'rust', 'mustard', 'lilac'],
  outline(g) {
    const pts: Point[] = [];
    for (let i = 0; i < 50; i++) {
      const a = (i / 50) * Math.PI * 2;
      const k = i % 2 ? 1.12 : 0.95 + hash(g.seed + i) * 0.06;
      pts.push([
        g.cx + ((Math.cos(a) * g.w) / 2) * k,
        g.y0 + g.h / 2 + ((Math.sin(a) * g.h) / 2) * k,
      ]);
    }
    return pts;
  },
  face: (g) => [g.cx, g.y0 + g.h * 0.44],
  under(pen, g, ink) {
    for (const s of [-1, 1]) {
      pen.fill(
        [
          [g.cx + s * 14, g.y0 + 6],
          [g.cx + s * 34, g.y0 - 12],
          [g.cx + s * 36, g.y0 + 14],
        ],
        ink.body,
        0.3,
      );
    }
  },
  deco(pen, g, ink) {
    const color = ink.light ? INK : WHITE;
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        pen.line(
          [
            [g.cx + s * 20, g.y0 + g.h * 0.62 + k * 4],
            [g.cx + s * (40 + k * 2), g.y0 + g.h * 0.56 + k * 7],
          ],
          1.2,
          color,
          0.1,
        );
      }
    }
  },
};
