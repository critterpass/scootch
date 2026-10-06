import type { MonsterBody } from '../core/body';
import { ell, type Point } from '../core/geometry';

/** A kettlebell: a round weight with a thick handle and a band near the base. */
export const kettle: MonsterBody = {
  width: 88,
  height: 76,
  legs: 'stub',
  tops: false,
  faceWidth: 0.7,
  outline: (g) => ell(g.cx, g.y1 - g.h * 0.4, g.w / 2, g.h * 0.4, 24),
  face: (g) => [g.cx, g.y1 - g.h * 0.42],
  under(pen, g, ink) {
    const handle: Point[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 1.12 + (i / 10) * Math.PI * 0.76;
      handle.push([g.cx + Math.cos(a) * g.w * 0.3, g.y1 - g.h * 0.66 + Math.sin(a) * g.h * 0.36]);
    }
    pen.line(handle, 10, ink.shade);
  },
  deco(pen, g, ink) {
    pen.line(
      [
        [g.cx - g.w * 0.44, g.y1 - g.h * 0.16],
        [g.cx + g.w * 0.44, g.y1 - g.h * 0.16],
      ],
      3,
      ink.shade,
    );
  },
};
