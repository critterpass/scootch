import type { MonsterBody } from '../core/body';
import { bez, ell, ribbon, rr } from '../core/geometry';

/** A music note: a tilted head with a stem and a flag. */
export const note: MonsterBody = {
  width: 70,
  height: 98,
  legs: 'none',
  tops: false,
  faceWidth: 0.62,
  outline: (g) => ell(g.cx - 8, g.y1 - 22, 30, 22, 20, 0, 0, -0.3),
  face: (g) => [g.cx - 8, g.y1 - 22],
  under(pen, g, ink) {
    const x = g.cx + 14;
    pen.fill(rr(x, g.y0, 8, g.h - 22, 2), ink.body);
    const flutter = Math.sin(g.t * 4) * 4;
    const flag = bez(
      [x + 6, g.y0 + 2],
      [x + 26, g.y0 + 10 + flutter],
      [x + 30, g.y0 + 26 + flutter],
      [x + 18, g.y0 + 40],
      8,
    );
    pen.fill(ribbon(flag, 5, 2, 2), ink.body);
  },
};
