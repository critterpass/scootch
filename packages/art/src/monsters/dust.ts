import type { MonsterBody } from '../core/body';
import { loop, type Point } from '../core/geometry';
import { hash } from '../core/rng';

/** A spiky ball of dust shedding a few motes. */
export const dust: MonsterBody = {
  width: 86,
  height: 80,
  legs: 'stub',
  tops: true,
  faceWidth: 0.7,
  inks: ['charcoal', 'lilac', 'mustard', 'navy'],
  outline(g) {
    const pts: Point[] = [];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2;
      const k = i % 2 ? 1.14 : 0.93 + hash(g.seed + i) * 0.08;
      pts.push([
        g.cx + ((Math.cos(a) * g.w) / 2) * k,
        g.y0 + g.h / 2 + ((Math.sin(a) * g.h) / 2) * k,
      ]);
    }
    return pts;
  },
  face: (g) => [g.cx, g.y0 + g.h * 0.44],
  deco(pen, g, ink) {
    for (let i = 0; i < 3; i++) {
      const k = loop(g.t, 0.4, i / 3);
      const x = g.cx + g.w * 0.5 + k * 16;
      const y = g.y0 + 10 + i * 10 - k * 8;
      pen.line(
        [
          [x, y],
          [x + 4, y - 3],
          [x + 7, y + 1],
        ],
        1.6,
        ink.body,
        0.38,
        1 - k,
      );
    }
  },
};
