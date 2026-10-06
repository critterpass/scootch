import { GROUND_Y } from '../core/commands';
import { rr } from '../core/geometry';
import { INK } from '../core/pen';
import { SCOOTCH } from '../scootch/palette';
import { bothBrows, defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, filled } from '../scootch/work-props';

/**
 * A pointer at a chart on an easel. `grow` raises the bars, 0 to 1; `talk` opens the mouth above a
 * half; `point` moves the pointing hand, -1 to 1.
 */
export const presenting = defineWorkMode(
  { grow: 1, talk: 0, point: 0 },
  {
    pose(e, { talk, point }) {
      e.lean = -6;
      e.lx = 0.85;
      e.ly = -0.25;
      e.open = 1;
      e.mouth = talk > 0.5 ? 'o' : 'smile';
      e.mw = 0.75;
      e.hr = [1.25, -0.15 + point * 0.08];
      e.hl = [0.6, 0.72];
      e.brows = bothBrows(-5, -0.1);
    },
    behind(pen, _g, { grow }) {
      const x = 148;
      const y = 26;
      for (const [from, to] of [
        [10, 4],
        [40, 46],
      ] as const) {
        pen.line(
          [
            [x + from, y + 66],
            [x + to, GROUND_Y + 4],
          ],
          2.4,
          INK,
          0.15,
        );
      }
      filled(pen, rr(x, y, 50, 66, 3), PAL.paper);
      const k = Math.min(1, Math.max(0, grow));
      const bars = [
        [SCOOTCH.body, 26],
        [PAL.stone, 18],
        [PAL.dark, 40],
      ] as const;
      bars.forEach(([color, height], i) => {
        pen.fill(rr(x + 9 + i * 12, y + 58 - height * k, 8, height * k + 0.1, 1), color, 0.1);
      });
    },
    held(pen, g) {
      const [x, y] = g.rightHand;
      pen.line(
        [
          [x, y],
          [x + 30, y - 26],
        ],
        2.2,
        PAL.dark,
        0.1,
      );
      pen.blot(x + 30, y - 26, 2.4, SCOOTCH.body, 0.05);
    },
  },
);
