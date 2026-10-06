import type { MonsterBody } from '../core/body';
import { rr } from '../core/geometry';

/** A sealed letter with a flap line and a stamp. */
export const envelope: MonsterBody = {
  width: 94,
  height: 64,
  legs: 'stick',
  tops: true,
  faceWidth: 0.6,
  outline: (g) => rr(g.cx - g.w / 2, g.y0, g.w, g.h, 6),
  face: (g) => [g.cx, g.y0 + g.h * 0.64],
  deco(pen, g, ink) {
    const x0 = g.cx - g.w / 2;
    const x1 = g.cx + g.w / 2;
    pen.line(
      [
        [x0 + 4, g.y0 + 4],
        [g.cx, g.y0 + g.h * 0.44],
        [x1 - 4, g.y0 + 4],
      ],
      2.6,
      ink.shade,
    );
    pen.fill(rr(x1 - 22, g.y0 + 8, 14, 16, 1), '#FBF8F2', 0.2);
    pen.blot(x1 - 15, g.y0 + 16, 3.4, ink.body, 0.1);
  },
};
