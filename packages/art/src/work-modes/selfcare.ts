import { ell, rr } from '../core/geometry';
import { INK } from '../core/pen';
import { SCOOTCH } from '../scootch/palette';
import { defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, filled, steam } from '../scootch/work-props';

/**
 * A towel on its head, cucumber on its eyes and a warm cup. `breath` is the slow rise and fall,
 * -1 to 1; `steam` is where the steam is, 0 to 1.
 */
export const selfcare = defineWorkMode(
  { breath: 0, steam: 0.2 },
  {
    pose(e, { breath }) {
      e.eye = 'closed';
      e.mouth = 'smile';
      e.mw = 0.6;
      e.blush = 1.3;
      e.hl = [1.0, 0.72];
      e.hr = [0.78, 0.58];
      e.dy = breath;
    },
    accessory(pen, g) {
      const x = g.cx;
      const y = g.cy - g.ry * 0.78;
      filled(pen, ell(x, y, g.rx * 0.78, 17, 18, 0.06, 1), PAL.paper);
      filled(pen, ell(x + 6, y - 14, 16, 10, 14, 0.1, 2), PAL.paper);
      pen.line(
        [
          [x - 20, y - 2],
          [x + 2, y - 10],
          [x + 24, y - 4],
        ],
        1.2,
        PAL.rule,
      );
      for (const s of [-1, 1]) {
        const cx = g.faceX + s * g.eyeGap;
        const cy = g.eyeY;
        pen.fill(ell(cx, cy, 11, 11, 14), PAL.leaf, 0.1);
        pen.fill(ell(cx, cy, 8, 8, 14), '#C9DDB0', 0.1);
        for (let i = 0; i < 4; i++) {
          pen.blot(cx + Math.cos(i * 1.6) * 4, cy + Math.sin(i * 1.6) * 4, 0.9, PAL.leaf, 0.02);
        }
      }
    },
    held(pen, g, loop) {
      const [x, y] = g.rightHand;
      filled(pen, rr(x - 12, y - 12, 18, 18, 3), PAL.paper);
      pen.line(
        [
          [x + 6, y - 8],
          [x + 11, y - 5],
          [x + 6, y],
        ],
        1.8,
        INK,
        0.1,
      );
      pen.fill(rr(x - 10, y - 10, 14, 3, 1), SCOOTCH.shade, 0.05);
      pen.fill(ell(x + 6, y - 2, 6, 5.4, 12), SCOOTCH.shade, 0.2);
      steam(pen, x - 3, y - 16, 2, loop.steam);
    },
  },
);
