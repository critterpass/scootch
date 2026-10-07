import type { MonsterBody } from '../core/body';
import { WHITE } from '../core/pen';

/** A lone sock with a ribbed cuff, a heel patch and a toe patch. */
export const sock: MonsterBody = {
  width: 78,
  height: 96,
  legs: 'none',
  tops: false,
  hop: true,
  faceWidth: 0.5,
  outline({ cx, y0, y1, w, h }) {
    const x0 = cx - w * 0.42;
    return [
      [x0, y0],
      [x0 + w * 0.56, y0],
      [x0 + w * 0.56, y1 - h * 0.4],
      [x0 + w * 0.9, y1 - h * 0.37],
      [x0 + w * 1.02, y1 - h * 0.2],
      [x0 + w * 0.94, y1],
      [x0 + w * 0.1, y1],
      [x0, y1 - h * 0.2],
    ];
  },
  face: (g) => [g.cx - g.w * 0.14, g.y0 + g.h * 0.36],
  deco(pen, g, ink) {
    const x0 = g.cx - g.w * 0.42;
    for (const y of [g.y0 + 8, g.y0 + 18]) {
      pen.line(
        [
          [x0 + 2, y],
          [x0 + g.w * 0.56 - 2, y],
        ],
        5,
        WHITE,
        0.38,
        0.3,
      );
    }
    pen.blot(x0 + g.w * 0.1, g.y1 - g.h * 0.12, 8, ink.shade);
    pen.blot(g.cx + g.w * 0.48, g.y1 - g.h * 0.12, 8, ink.shade);
  },
};
