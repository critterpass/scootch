import type { MonsterBody } from '../core/body';
import { hexagon, rot, rr } from '../core/geometry';
import { WHITE } from '../core/pen';

/** A square plate with a hex bolt on top and a screw in each corner. */
export const bolt: MonsterBody = {
  width: 80,
  height: 80,
  legs: 'stick',
  tops: false,
  faceWidth: 0.7,
  outline: (g) => rr(g.cx - g.w / 2, g.y0, g.w, g.h, 10),
  face: (g) => [g.cx, g.y0 + g.h * 0.48],
  deco(pen, g, ink) {
    pen.fill(rr(g.cx - 4, g.y0 - 10, 8, 12, 1), '#B8AC97');
    pen.fill(rot(hexagon(g.cx, g.y0 - 14, 10), g.cx, g.y0 - 14, g.t * 0.5), '#C9C1B4', 0.2);
    const corners = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const;
    for (const [x, y] of corners) {
      const px = g.cx + x * (g.w / 2 - 9);
      const py = g.y0 + g.h / 2 + y * (g.h / 2 - 9);
      pen.blot(px, py, 3.6, WHITE, 0.12, 0.45);
      pen.line(
        [
          [px - 2.4, py],
          [px + 2.4, py],
        ],
        1.2,
        ink.shade,
      );
    }
  },
};
