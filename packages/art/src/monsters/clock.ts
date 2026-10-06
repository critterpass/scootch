import type { MonsterBody } from '../core/body';
import { ell } from '../core/geometry';
import { WHITE } from '../core/pen';

/** An alarm clock: two bells and a hammer behind a round face with hour ticks. */
export const clock: MonsterBody = {
  width: 88,
  height: 88,
  legs: 'stick',
  tops: false,
  faceWidth: 0.7,
  outline: (g) => ell(g.cx, g.y0 + g.h / 2, g.w / 2, g.h / 2, 26),
  face: (g) => [g.cx, g.y0 + g.h * 0.46],
  under(pen, g, ink) {
    const ring = Math.sin(g.t * 30) * 2;
    for (const s of [-1, 1]) {
      pen.fill(ell(g.cx + s * g.w * 0.36 + ring, g.y0 + 4, 12, 10, 14, 0, 0, s * 0.5), ink.shade);
    }
    pen.line(
      [
        [g.cx, g.y0 - 2],
        [g.cx + ring * 2, g.y0 - 12],
      ],
      2.4,
      ink.shade,
    );
  },
  deco(pen, g) {
    const cy = g.y0 + g.h / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = g.w / 2 - 4;
      const r2 = g.w / 2 - (i % 3 ? 7 : 10);
      pen.line(
        [
          [g.cx + Math.cos(a) * r1, cy + Math.sin(a) * r1],
          [g.cx + Math.cos(a) * r2, cy + Math.sin(a) * r2],
        ],
        1.8,
        WHITE,
        0.38,
        0.55,
      );
    }
  },
};
