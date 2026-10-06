import type { MonsterBody } from '../core/body';
import { rot, rr } from '../core/geometry';

/** A cardboard box, always kraft, with two open flaps and a strip of tape. */
export const box: MonsterBody = {
  width: 90,
  height: 74,
  legs: 'stick',
  tops: false,
  faceWidth: 0.66,
  inks: ['kraft'],
  outline: (g) => rr(g.cx - g.w / 2, g.y0 + 10, g.w, g.h - 10, 2),
  face: (g) => [g.cx, g.y0 + g.h * 0.58],
  under(pen, g) {
    const flap = Math.sin(g.t * 3) * 0.12;
    for (const s of [-1, 1]) {
      const x = g.cx + (s * g.w) / 2;
      const y = g.y0 + 10;
      pen.fill(
        rot(
          [
            [x, y],
            [g.cx + s * 4, y],
            [g.cx + s * 10, y - 20],
            [x + s * 10, y - 16],
          ],
          x,
          y,
          s * flap,
        ),
        '#C9A574',
        0.2,
      );
    }
  },
  deco(pen, g) {
    pen.fill(rr(g.cx - 6, g.y0 + 10, 12, g.h - 10, 1), '#B8AC97', 0.38, 0.7);
  },
};
