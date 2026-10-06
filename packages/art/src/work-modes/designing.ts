import { GROUND_Y } from '../core/commands';
import { ell, rr } from '../core/geometry';
import { INK } from '../core/pen';
import { hash } from '../core/rng';
import { SCOOTCH } from '../scootch/palette';
import { defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, filled } from '../scootch/work-props';

const BERET = '#2C2724';

/**
 * A beret, a palette and a brush at an easel. `dab` moves the brush hand, -1 to 1; `painted` is
 * how much of the canvas has paint on it, 0 to 1.
 */
export const designing = defineWorkMode(
  { dab: 0, painted: 0.8 },
  {
    pose(e, { dab }) {
      e.open = 0.82;
      e.lx = -0.75;
      e.ly = -0.15;
      e.mouth = 'cat';
      e.hl = [1.18 + dab * 0.06, -0.1 + dab * 0.14];
      e.hr = [1.0, 0.58];
      e.lean = -2;
    },
    behind(pen, _g, { painted }) {
      const x = 2;
      const y = 34;
      for (const [from, to] of [
        [12, 6],
        [36, 42],
      ] as const) {
        pen.line(
          [
            [x + from, y + 70],
            [x + to, GROUND_Y + 4],
          ],
          2.4,
          INK,
          0.15,
        );
      }
      filled(pen, rr(x, y, 48, 70, 2), PAL.paper);
      const paints = [SCOOTCH.body, PAL.gold, PAL.water, PAL.leaf, SCOOTCH.shade, PAL.dark];
      const blobs = Math.floor(Math.min(1, Math.max(0, painted)) * 6.999);
      for (let i = 0; i < blobs; i++) {
        const blob = ell(
          x + 10 + hash(i * 5) * 28,
          y + 10 + hash(i * 5 + 1) * 50,
          6 + hash(i) * 6,
          4 + hash(i + 3) * 5,
          10,
          0.2,
          i,
        );
        pen.fill(blob, paints[i % paints.length] ?? PAL.dark, 0.3);
      }
    },
    accessory(pen, g) {
      const x = g.cx - 8;
      const y = g.cy - g.ry + 3;
      pen.riso(ell(x, y, 32, 11, 18, 0.05, 0, -0.2), BERET, '#171412', [x, y], 70, 60, {
        offset: 4,
        grains: 50,
      });
      pen.blot(x + 4, y - 11, 3.4, BERET);
    },
    held(pen, g) {
      const [x, y] = g.leftHand;
      pen.line(
        [
          [x + 4, y + 4],
          [x - 12, y - 8],
        ],
        2.6,
        PAL.tan,
        0.1,
      );
      pen.blot(x - 13, y - 9, 2.6, SCOOTCH.body, 0.1);
      const [px, py] = g.rightHand;
      filled(pen, ell(px + 4, py - 2, 18, 11, 14, 0.12, 2), PAL.tan, 1.4);
      [SCOOTCH.body, PAL.water, PAL.leaf, PAL.gold].forEach((color, i) => {
        pen.blot(px - 6 + i * 6, py - 6 + (i % 2) * 5, 2.6, color, 0.05);
      });
    },
  },
);
