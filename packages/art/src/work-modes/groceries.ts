import { ell, rot, rr } from '../core/geometry';
import { defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, outline } from '../scootch/work-props';

/**
 * A full paper bag carried in both arms. `step` is the lift of each stride, 0 to 1; `sway` rocks
 * the body from side to side, -1 to 1.
 */
export const groceries = defineWorkMode(
  { step: 0, sway: 0 },
  {
    pose(e, { step, sway }) {
      e.dy = -step * 4;
      e.lean = sway * 3;
      e.rot = sway * 0.03;
      e.mouth = 'smile';
      e.open = 0.9;
      e.lx = 0.3;
      e.hl = [0.62, 0.72];
      e.hr = [0.62, 0.72];
    },
    held(pen, g) {
      const x = g.cx;
      const y = g.cy + g.ry * 0.5;
      const loaf = rot(ell(x - 22, y - 8, 24, 5, 12), x - 22, y - 8, -0.9);
      pen.fill(loaf, PAL.tan, 0.2);
      outline(pen, loaf, 1.3);
      for (const [dx, turn] of [
        [16, 0.3],
        [22, 0.8],
      ] as const) {
        pen.fill(rot(ell(x + dx, y - 10, 5, 11, 10), x + dx, y - 2, turn), PAL.leaf, 0.2);
      }
      pen.riso(rr(x - 28, y, 56, 44, 3), PAL.card, PAL.cardShade, [x, y + 22], 70, 60, {
        offset: 5,
        grains: 40,
      });
      pen.line(
        [
          [x - 28, y + 6],
          [x + 28, y + 6],
        ],
        1.2,
        '#A88B5E',
      );
    },
  },
);
