import type { MonsterBody } from '../core/body';
import { blobPts, ell, rot } from '../core/geometry';

/** A stubborn weed: a bulb with three leaves on stalks. */
export const weed: MonsterBody = {
  width: 72,
  height: 86,
  legs: 'roots',
  tops: false,
  faceWidth: 0.7,
  inks: ['moss', 'teal', 'mustard', 'charcoal'],
  outline: (g) =>
    blobPts(g.cx, g.y0 + g.h * 0.6, g.w / 2, g.h * 0.42, 22, {
      taper: 0.35,
      peak: 0.45,
      flat: 0.92,
    }),
  face: (g) => [g.cx, g.y0 + g.h * 0.6],
  deco(pen, g) {
    const stalks = [
      [-0.6, 22],
      [0, 28],
      [0.6, 20],
    ] as const;
    stalks.forEach(([lean, length], i) => {
      const a = lean + Math.sin(g.t * 2 + i) * 0.1;
      const bx = g.cx;
      const by = g.y0 + g.h * 0.18;
      const ex = bx + Math.sin(a) * length;
      const ey = by - Math.cos(a) * length;
      pen.line(
        [
          [bx, by],
          [ex, ey],
        ],
        2.2,
        '#4C6A4C',
      );
      pen.fill(
        rot(ell(ex, ey, 9, 4, 12), ex, ey, a - Math.PI / 2 + 0.5),
        i === 1 ? '#78A57F' : '#5E8A66',
        0.2,
      );
    });
  },
};
