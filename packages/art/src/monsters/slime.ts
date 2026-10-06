import type { MonsterBody } from '../core/body';
import { loop, type Point } from '../core/geometry';

/** A dome of slime with three drips and bubbles rising off it. */
export const slime: MonsterBody = {
  width: 98,
  height: 72,
  legs: 'none',
  tops: true,
  faceWidth: 0.7,
  outline({ cx, y0, w, h, t }) {
    const pts: Point[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI;
      pts.push([cx + (Math.cos(a) * w) / 2, y0 + h * 0.58 + Math.sin(a) * h * 0.58]);
    }
    const bottom = y0 + h * 0.92;
    for (let i = 1; i < 16; i++) {
      const drip = [3, 8, 12].includes(i) ? 7 + Math.sin(t * 2 + i) * 4 : 0;
      pts.push([cx + w / 2 - (i * w) / 16, bottom + drip - (i % 2) * 2]);
    }
    return pts;
  },
  face: (g) => [g.cx, g.y0 + g.h * 0.44],
  deco(pen, g) {
    for (let i = 0; i < 2; i++) {
      const k = loop(g.t, 0.35, i * 0.5);
      pen.blot(g.cx - 18 + i * 30, g.y0 + 10 - k * 18, 3 + i, '#FFFFFF', 0.1, 0.4 * (1 - k));
    }
  },
};
