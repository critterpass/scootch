import type { MonsterBody } from '../core/body';
import { ell, rr } from '../core/geometry';

/** A rolled contract with a roller at each end and small print. */
export const scroll: MonsterBody = {
  width: 72,
  height: 92,
  legs: 'stub',
  tops: true,
  faceWidth: 0.72,
  outline: (g) => rr(g.cx - g.w / 2 + 4, g.y0 + 6, g.w - 8, g.h - 12, 2),
  face: (g) => [g.cx, g.y0 + g.h * 0.36],
  deco(pen, g, ink) {
    pen.fill(ell(g.cx, g.y0 + 6, g.w / 2 + 2, 7, 16), ink.shade);
    pen.fill(ell(g.cx, g.y1 - 6, g.w / 2 + 2, 7, 16), ink.shade);
    for (let k = 0; k < 3; k++) {
      const y = g.y0 + g.h * 0.66 + k * 6;
      pen.line(
        [
          [g.cx - g.w * 0.3, y],
          [g.cx + g.w * 0.3 - k * 6, y],
        ],
        1.6,
        ink.shade,
      );
    }
  },
};
