import { ell, rr } from '../core/geometry';
import { INK } from '../core/pen';
import { SCOOTCH } from '../scootch/palette';
import { defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, desk, filled, outline } from '../scootch/work-props';

const DOWN = 0.7;

/**
 * A rubber stamp over a pile of forms. `stamp` is one stamping, 0 to 1: the hand lifts and comes
 * down by 0.7, then rests on the page with the mark showing.
 */
export const paperwork = defineWorkMode(
  { stamp: 0.75 },
  {
    pose(e, { stamp }) {
      const landed = stamp > DOWN;
      const lift = landed ? 0 : (1 - Math.abs((stamp / DOWN) * 2 - 1)) * 22;
      e.hr = [0.72, 0.74 - lift / 50];
      e.hl = [0.95, 0.8];
      e.open = landed ? 0.35 : 0.75;
      e.ly = 0.8;
      e.lx = 0.5;
      e.mouth = landed ? 'grin' : 'side';
      e.mw = landed ? 0.7 : 1;
    },
    prop(pen, g, { stamp }) {
      desk(pen, g);
      const x = g.cx + 30;
      filled(pen, rr(x - 26, g.by - 7, 52, 7, 1), PAL.paper, 1.2);
      filled(pen, rr(x - 24, g.by - 12, 50, 6, 1), PAL.paper, 1.2);
      if (stamp > DOWN) {
        outline(pen, ell(g.rightHand[0], g.by - 10, 7, 2.5, 12), 2, SCOOTCH.body);
      }
    },
    held(pen, g, { stamp }) {
      const [x, y] = g.rightHand;
      pen.blot(x, y - 11, 6, PAL.dark);
      pen.fill(rr(x - 4, y - 7, 8, 12, 2), PAL.dark, 0.1);
      pen.fill(rr(x - 11, y + 5, 22, 8, 2), '#2C2724', 0.1);
      pen.fill(rr(x - 10, y + 12, 20, 4, 1), SCOOTCH.body, 0.1);
      if (stamp > DOWN && stamp < 0.82) {
        for (const s of [-1, 1]) {
          pen.line(
            [
              [x + s * 16, y + 14],
              [x + s * 24, y + 10],
            ],
            2,
            INK,
            0.1,
          );
        }
      }
    },
  },
);
