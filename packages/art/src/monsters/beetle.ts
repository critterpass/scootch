import type { MonsterBody } from '../core/body';
import { ell } from '../core/geometry';

/** A round bug with a wing seam, spots and its own two feelers. */
export const beetle: MonsterBody = {
  width: 94,
  height: 76,
  legs: 'six',
  tops: true,
  faceWidth: 0.7,
  outline: (g) => ell(g.cx, g.y0 + g.h / 2, g.w / 2, g.h / 2, 24),
  face: (g) => [g.cx, g.y0 + g.h * 0.34],
  deco(pen, g, ink) {
    pen.line(
      [
        [g.cx, g.y0 + g.h * 0.58],
        [g.cx, g.y1 - 3],
      ],
      2.4,
      ink.shade,
    );
    const spots = [
      [-0.25, 0.7],
      [0.27, 0.68],
      [-0.12, 0.86],
      [0.14, 0.88],
    ] as const;
    for (const [dx, dy] of spots) pen.blot(g.cx + dx * g.w, g.y0 + dy * g.h, 4, ink.shade);
    for (const s of [-1, 1]) {
      const sway = Math.sin(g.t * 3 + s) * 0.15;
      const ex = g.cx + s * 18 + Math.sin(s * 0.5 + sway) * 14;
      const ey = g.y0 - 16;
      pen.line(
        [
          [g.cx + s * 8, g.y0 + 4],
          [g.cx + s * 14, g.y0 - 6],
          [ex, ey],
        ],
        2,
        ink.shade,
      );
      pen.blot(ex, ey, 3, ink.shade);
    }
  },
};
