import { ell, rr } from '../core/geometry';
import { defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL, desk, filled } from '../scootch/work-props';

/**
 * A chef's hat, a pot and a wooden spoon. `stir` is one turn of the spoon, 0 to 1; `steam` is
 * where the steam is, 0 to 1.
 */
export const cooking = defineWorkMode(
  { stir: 0, steam: 0.2 },
  {
    pose(e, { stir }) {
      const a = stir * Math.PI * 2;
      e.open = 0.7;
      e.ly = 0.75;
      e.mouth = 'tongue';
      e.hr = [0.3 + Math.cos(a) * 0.16, 0.82 + Math.sin(a) * 0.04];
      e.hl = [1.06, 0.72];
    },
    accessory(pen, g) {
      const x = g.cx + 2;
      const y = g.cy - g.ry + 6;
      filled(pen, rr(x - 22, y - 8, 44, 12, 3), PAL.paper);
      const puffs = [
        [-14, -16, 12],
        [0, -22, 14],
        [14, -16, 12],
      ] as const;
      for (const [dx, dy, r] of puffs) filled(pen, ell(x + dx, y + dy, r, r * 0.85, 14), PAL.paper);
    },
    prop(pen, g) {
      desk(pen, g);
      const x = g.cx;
      const y = g.by;
      pen.riso(rr(x - 34, y - 28, 68, 28, 6), PAL.dark, '#221E1B', [x, y - 14], 70, 60, {
        offset: 5,
        grains: 40,
      });
      pen.fill(ell(x, y - 28, 34, 5, 16), '#2A2622', 0.2);
      for (const s of [-1, 1]) {
        pen.line(
          [
            [x + s * 34, y - 22],
            [x + s * 42, y - 22],
          ],
          4,
          PAL.dark,
          0.1,
        );
      }
    },
    held(pen, g) {
      const [x, y] = g.rightHand;
      pen.line(
        [
          [x, y - 4],
          [x - 4, g.by - 26],
        ],
        3,
        PAL.tan,
        0.1,
      );
    },
    effect(pen, g, { steam }) {
      for (let i = 0; i < 3; i++) {
        const k = phase(steam, i / 3);
        const x = g.cx - 16 + i * 16;
        const y = g.by - 34 - k * 30;
        pen.line(
          [
            [x, y],
            [x + 4, y - 6],
            [x, y - 12],
            [x + 4, y - 18],
          ],
          2,
          '#A79D90',
          0.2,
          (1 - k) * 0.8,
        );
      }
    },
  },
);
