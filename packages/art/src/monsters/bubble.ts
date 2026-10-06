import type { MonsterBody } from '../core/body';
import { rr } from '../core/geometry';

/** A speech bubble that floats, with a tail and three typing dots. */
export const bubble: MonsterBody = {
  width: 92,
  height: 72,
  legs: 'none',
  tops: true,
  faceWidth: 0.75,
  hover: true,
  outline: (g) => rr(g.cx - g.w / 2, g.y0, g.w, g.h * 0.8, 22),
  face: (g) => [g.cx, g.y0 + g.h * 0.38],
  under(pen, g, ink) {
    const x0 = g.cx - g.w / 2;
    pen.fill(
      [
        [x0 + 16, g.y0 + g.h * 0.7],
        [x0 + 6, g.y1 + 2],
        [x0 + 36, g.y0 + g.h * 0.74],
      ],
      ink.body,
      0.3,
    );
  },
  deco(pen, g, ink) {
    for (let i = 0; i < 3; i++) {
      const lift = Math.max(0, Math.sin(g.t * 5 - i)) * 4;
      pen.blot(g.cx + g.w * 0.5 + 8 + i * 8, g.y0 - 2 - lift, 2.4, ink.body, 0.05);
    }
  },
};
