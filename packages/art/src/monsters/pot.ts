import type { MonsterBody } from '../core/body';
import { ell, loop, rr } from '../core/geometry';

/** A cooking pot with a rim, two handles, a lid and steam. */
export const pot: MonsterBody = {
  width: 98,
  height: 64,
  legs: 'stub',
  tops: false,
  faceWidth: 0.65,
  outline: (g) => rr(g.cx - g.w / 2 + 6, g.y0 + 12, g.w - 12, g.h - 12, 12),
  face: (g) => [g.cx, g.y0 + g.h * 0.62],
  deco(pen, g, ink) {
    pen.fill(rr(g.cx - g.w / 2, g.y0 + 8, g.w, 9, 4), ink.shade);
    for (const s of [-1, 1]) {
      pen.line(
        [
          [g.cx + s * (g.w / 2 - 2), g.y0 + 22],
          [g.cx + s * (g.w / 2 + 10), g.y0 + 22],
        ],
        5,
        ink.shade,
      );
    }
    const lid = g.y0 + 4 - Math.max(0, Math.sin(g.t * 6)) * 3;
    pen.fill(ell(g.cx, lid, g.w * 0.38, 6, 16), ink.shade);
    pen.blot(g.cx, lid - 6, 4, ink.shade);
    for (let i = 0; i < 2; i++) {
      const k = loop(g.t, 0.5, i * 0.5);
      const x = g.cx - 10 + i * 20;
      pen.line(
        [
          [x, lid - 10 - k * 18],
          [x + 3, lid - 15 - k * 18],
          [x, lid - 20 - k * 18],
        ],
        1.8,
        '#A79D90',
        0.38,
        (1 - k) * 0.7,
      );
    }
  },
};
