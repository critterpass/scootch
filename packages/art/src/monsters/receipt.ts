import type { MonsterBody } from '../core/body';
import type { Point } from '../core/geometry';

/** A long till receipt with a torn edge, three eyes and printed lines. */
export const receipt: MonsterBody = {
  width: 62,
  height: 98,
  legs: 'stick',
  tops: true,
  faceWidth: 0.85,
  eyes: 3,
  outline({ cx, y0, y1, w }) {
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    const pts: Point[] = [
      [x0, y0 + 2],
      [x0 + 2, y0],
      [x1 - 2, y0],
      [x1, y0 + 2],
      [x1, y1 - 6],
    ];
    for (let i = 1; i < 7; i++) pts.push([x1 - (i * w) / 6, y1 - (i % 2 ? 0 : 6)]);
    pts.push([x0, y1 - 6]);
    return pts;
  },
  face: (g) => [g.cx, g.y0 + g.h * 0.24],
  deco(pen, g, ink) {
    for (let k = 0; k < 4; k++) {
      const y = g.y0 + g.h * 0.6 + k * 7;
      pen.line(
        [
          [g.cx - g.w / 2 + 8, y],
          [g.cx + g.w / 2 - 8 - (k % 2) * 12, y],
        ],
        1.8,
        ink.shade,
      );
    }
  },
};
