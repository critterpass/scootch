import { rot, rr, type Point } from '../core/geometry';
import { SCOOTCH } from '../scootch/palette';
import { defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, desk } from '../scootch/work-props';

/**
 * Things tossed over the shoulder into an open box. `toss` is one throw, 0 to 1: the arm swings
 * up in the first third, then the thing flies to the box until 0.8.
 */
export const decluttering = defineWorkMode(
  { toss: 0.5 },
  {
    pose(e, { toss }) {
      const swing = Math.max(0, Math.sin(Math.min(1, toss / 0.3) * Math.PI));
      e.open = 0.85;
      e.lx = 0.6;
      e.ly = 0.3;
      e.mouth = 'cat';
      e.hl = [1.0, 0.45 - 0.55 * swing];
      e.hr = [0.3, 0.9];
    },
    prop(pen, g) {
      desk(pen, g);
      const x = g.cx + 48;
      const y = g.by;
      pen.riso(rr(x - 26, y - 30, 52, 30, 2), PAL.card, PAL.cardShade, [x, y - 15], 70, 60, {
        offset: 4,
        grains: 30,
      });
      for (const s of [-1, 1]) {
        const flap: Point[] = [
          [x + s * 26, y - 30],
          [x + s * 34, y - 42],
          [x + s * 8, y - 36],
        ];
        pen.fill(flap, '#D9C29B', 0.2);
      }
      pen.line(
        [
          [x - 6, y - 30],
          [x - 6, y - 18],
        ],
        3,
        PAL.cardShade,
        0.1,
      );
    },
    effect(pen, g, { toss }) {
      if (toss <= 0.3 || toss >= 0.8) return;
      const u = (toss - 0.3) / 0.5;
      const [sx, sy] = g.leftHand;
      const x = sx + (g.cx + 48 - sx) * u;
      const y = sy + (g.by - 36 - sy) * u - Math.sin(u * Math.PI) * 60;
      pen.fill(rot(rr(x - 4, y - 8, 8, 16, 4), x, y, u * 6), SCOOTCH.body, 0.2);
    },
  },
);
