import { rot, rr, type Point } from '../core/geometry';
import { SCOOTCH } from '../scootch/palette';
import { defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, filled } from '../scootch/work-props';

/** A shirt folded in both hands beside a basket. `fold` brings the hands together, 0 to 1. */
export const laundry = defineWorkMode(
  { fold: 0.5 },
  {
    pose(e, { fold }) {
      e.mouth = 'smile';
      e.open = 0.75;
      e.ly = 0.7;
      e.hl = [0.78 - fold * 0.3, 0.68];
      e.hr = [0.78 - fold * 0.3, 0.68];
    },
    behind(pen) {
      filled(pen, rr(150, 146, 46, 28, 4), PAL.tan);
      for (let i = 1; i < 4; i++) {
        pen.line(
          [
            [150 + i * 11.5, 148],
            [150 + i * 11.5, 172],
          ],
          1,
          '#B08D5E',
        );
      }
      pen.fill(rot(rr(160, 132, 9, 18, 4), 164, 141, 0.5), SCOOTCH.body, 0.2);
    },
    held(pen, g, { fold }) {
      const w = 1 - fold * 0.45;
      const x = g.cx;
      const y = g.cy + g.ry * 0.7;
      const half = 30 * w;
      const shirt: Point[] = [
        [x - half, y - 12],
        [x - half - 10 * w, y - 4],
        [x - half - 6 * w, y + 2],
        [x - half, y - 2],
        [x - half, y + 20],
        [x + half, y + 20],
        [x + half, y - 2],
        [x + half + 6 * w, y + 2],
        [x + half + 10 * w, y - 4],
        [x + half, y - 12],
        [x + 7, y - 12],
        [x, y - 7],
        [x - 7, y - 12],
      ];
      filled(pen, shirt, PAL.water);
    },
  },
);
