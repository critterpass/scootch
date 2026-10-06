import { GROUND_Y } from '../core/commands';
import { ell, rot, rr } from '../core/geometry';
import { SCOOTCH } from '../scootch/palette';
import { defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL, filled } from '../scootch/work-props';

/**
 * A watering can tipped over a pot plant. `sway` moves the leaves, -1 to 1; `pour` is where the
 * drops are, 0 to 1.
 */
export const plants = defineWorkMode(
  { sway: 0, pour: 0.2 },
  {
    pose(e) {
      e.open = 0.9;
      e.lx = 0.85;
      e.ly = 0.55;
      e.mouth = 'smile';
      e.hr = [1.12, 0.05];
      e.hl = [0.5, 0.85];
    },
    behind(pen, _g, { sway }) {
      const x = 172;
      const y = GROUND_Y + 4;
      pen.fill(rr(x - 16, y - 22, 32, 22, 3), SCOOTCH.shade, 0.2);
      pen.fill(rr(x - 19, y - 26, 38, 6, 2), SCOOTCH.shade, 0.2);
      for (const [lean, length] of [
        [-0.5, 22],
        [0, 30],
        [0.55, 20],
      ] as const) {
        const a = lean + sway * 0.08;
        const ex = x + Math.sin(a) * length;
        const ey = y - 26 - Math.cos(a) * length;
        pen.line(
          [
            [x, y - 26],
            [ex, ey],
          ],
          2,
          '#5E8A66',
          0.1,
        );
        pen.fill(rot(ell(ex, ey, 7, 3.5, 10), ex, ey, a - 0.6), PAL.leaf, 0.2);
      }
    },
    held(pen, g) {
      const [x, y] = g.rightHand;
      const tip = 0.45;
      filled(pen, rot(rr(x - 6, y - 10, 20, 16, 4), x, y, tip), PAL.grey);
      const spout = rot(
        [
          [x + 14, y - 4],
          [x + 28, y - 12],
        ],
        x,
        y,
        tip,
      );
      pen.line(spout, 3, PAL.stone, 0.1);
    },
    effect(pen, g, { pour }) {
      const [x, y] = g.rightHand;
      for (let i = 0; i < 4; i++) {
        const k = phase(pour, i / 4);
        pen.fill(ell(x + 24 + k * 14, y + 10 + k * 26, 1.8, 2.6, 8), PAL.water, 0.1, 1 - k * 0.6);
      }
    },
  },
);
