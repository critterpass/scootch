import type { MonsterBody } from '../core/body';
import { WHITE } from '../core/pen';

/** A molar with two roots. */
export const tooth: MonsterBody = {
  width: 84,
  height: 80,
  legs: 'none',
  tops: false,
  faceWidth: 0.7,
  outline({ cx, y0, y1, w, h }) {
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    return [
      [x0 + 3, y0 + h * 0.28],
      [x0 + w * 0.1, y0 + 5],
      [cx - w * 0.24, y0],
      [cx - 5, y0 + h * 0.1],
      [cx + 5, y0 + h * 0.1],
      [cx + w * 0.24, y0],
      [x1 - w * 0.1, y0 + 5],
      [x1 - 3, y0 + h * 0.28],
      [x1 - 2, y0 + h * 0.56],
      [x1 - w * 0.16, y0 + h * 0.78],
      [cx + w * 0.3, y1],
      [cx + w * 0.12, y1 - 3],
      [cx + w * 0.05, y0 + h * 0.74],
      [cx - w * 0.05, y0 + h * 0.74],
      [cx - w * 0.12, y1 - 3],
      [cx - w * 0.3, y1],
      [x0 + w * 0.16, y0 + h * 0.78],
      [x0 + 2, y0 + h * 0.56],
    ];
  },
  face: (g) => [g.cx, g.y0 + g.h * 0.34],
  deco(pen, g, ink) {
    pen.line(
      [
        [g.cx - g.w * 0.32, g.y0 + g.h * 0.22],
        [g.cx - g.w * 0.26, g.y0 + g.h * 0.12],
      ],
      3,
      WHITE,
      0.38,
      0.35,
    );
    pen.blot(g.cx + g.w * 0.26, g.y0 + g.h * 0.56, 4.5, ink.shade);
  },
};
