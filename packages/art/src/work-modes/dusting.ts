import { ell } from '../core/geometry';
import { INK } from '../core/pen';
import { defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL } from '../scootch/work-props';

/**
 * A feather duster held high, dust puffing off it. `flick` swings the duster, -1 to 1; `dust` is
 * where the puffs are, 0 to 1; `sneeze` above a half is the sneeze the dust brings on.
 */
export const dusting = defineWorkMode(
  { flick: 0, dust: 0.25, sneeze: 0 },
  {
    pose(e, { flick, sneeze }) {
      e.open = 0.45;
      e.mouth = 'o';
      e.mw = 0.5;
      e.hr = [1.12, -0.32 + flick * 0.2];
      e.hl = [0.4, 0.9];
      e.lx = 0.6;
      e.ly = -0.5;
      if (sneeze > 0.5) {
        e.eye = 'squeeze';
        e.mouth = 'wail';
        e.dy = -3;
      }
    },
    held(pen, g, { flick }) {
      const [x, y] = g.rightHand;
      const a = -1 + flick * 0.3;
      const tx = x + Math.cos(a) * 26;
      const ty = y + Math.sin(a) * 26;
      pen.line(
        [
          [x, y],
          [tx, ty],
        ],
        2.6,
        PAL.tan,
        0.1,
      );
      for (let i = 0; i < 6; i++) {
        const b = (i / 6) * Math.PI * 2;
        const feather = ell(tx + Math.cos(b) * 5, ty - 4 + Math.sin(b) * 5, 6, 4, 10, 0, 0, b);
        pen.fill(feather, i % 2 ? PAL.stone : PAL.grey, 0.3);
      }
    },
    effect(pen, g, { dust, sneeze }) {
      const [x, y] = g.rightHand;
      for (let i = 0; i < 3; i++) {
        const k = phase(dust, i / 3);
        const r = 3 + k * 6;
        pen.fill(
          ell(x + 20 + i * 8 + k * 10, y - 30 - k * 14, r, r, 10),
          PAL.grey,
          0.2,
          0.7 - k * 0.7,
        );
      }
      if (sneeze > 0.5) {
        pen.line(
          [
            [g.cx - 64, g.cy - 10],
            [g.cx - 76, g.cy - 14],
          ],
          2.2,
          INK,
        );
      }
    },
  },
);
