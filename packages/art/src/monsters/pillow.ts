import type { MonsterBody } from '../core/body';

/** A sleepy pillow with four pinched corners and a button. */
export const pillow: MonsterBody = {
  width: 102,
  height: 62,
  legs: 'none',
  tops: false,
  faceWidth: 0.6,
  sleepy: true,
  inks: ['navy', 'plum', 'lilac', 'teal'],
  outline({ cx, y0, y1, w }) {
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    const my = (y0 + y1) / 2;
    return [
      [x0 - 4, y0 - 4],
      [cx - w * 0.25, y0 + 5],
      [cx + w * 0.25, y0 + 5],
      [x1 + 4, y0 - 4],
      [x1 - 5, my - 10],
      [x1 - 5, my + 10],
      [x1 + 4, y1 + 4],
      [cx + w * 0.25, y1 - 5],
      [cx - w * 0.25, y1 - 5],
      [x0 - 4, y1 + 4],
      [x0 + 5, my + 10],
      [x0 + 5, my - 10],
    ];
  },
  face: (g) => [g.cx, g.y0 + g.h * 0.44],
  deco(pen, g, ink) {
    pen.blot(g.cx, g.y1 - 12, 3, ink.shade);
  },
};
