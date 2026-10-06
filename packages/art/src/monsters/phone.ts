import type { MonsterBody } from '../core/body';
import { loop, rr, type Point } from '../core/geometry';
import { INK, WHITE } from '../core/pen';

/** A ringing phone: a dark screen, a home button and ring lines either side. */
export const phone: MonsterBody = {
  width: 60,
  height: 100,
  legs: 'stick',
  tops: true,
  faceWidth: 0.8,
  outline: (g) => rr(g.cx - g.w / 2, g.y0, g.w, g.h, 13),
  face: (g) => [g.cx, g.y0 + g.h * 0.4],
  deco(pen, g, ink) {
    pen.fill(rr(g.cx - g.w / 2 + 6, g.y0 + 10, g.w - 12, g.h - 28, 6), ink.shade);
    pen.blot(g.cx, g.y1 - 9, 3.2, WHITE, 0.12, 0.5);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const radius = 10 + k * 7;
        const pts: Point[] = [];
        for (let i = 0; i <= 5; i++) {
          const a = (s > 0 ? 0 : Math.PI) - 0.55 + (i / 5) * 1.1;
          pts.push([
            g.cx + s * (g.w / 2 + 2) + Math.cos(a) * radius,
            g.y0 + 18 + Math.sin(a) * radius,
          ]);
        }
        pen.line(pts, 2, INK, 0.2, 0.3 + 0.7 * loop(g.t, 2, -k * 0.3));
      }
    }
  },
};
