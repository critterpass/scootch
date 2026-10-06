import { ell, rot, rr } from '../core/geometry';
import { bothBrows, defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, desk, filled, outline } from '../scootch/work-props';

/** A magnifying glass over two sheets. `sweep` moves the glass and the eyes across, -1 to 1. */
export const research = defineWorkMode(
  { sweep: 0.5 },
  {
    pose(e, { sweep }) {
      e.open = 1.05;
      e.pup = 0.5;
      e.lx = sweep * 0.6;
      e.ly = 0.5;
      e.mouth = 'o';
      e.mw = 0.55;
      e.hr = [0.5 + sweep * 0.32, 0.66];
      e.hl = [1.05, 0.62];
      e.brows = bothBrows(-5, -0.1);
    },
    prop(pen, g) {
      desk(pen, g);
      const left = rot(rr(g.cx - 40, g.by - 14, 40, 15, 2), g.cx - 20, g.by - 7, 0.06);
      const right = rot(rr(g.cx + 2, g.by - 15, 40, 16, 2), g.cx + 22, g.by - 7, -0.05);
      filled(pen, left, PAL.paper, 1.2);
      filled(pen, right, PAL.paper, 1.2);
    },
    held(pen, g) {
      const [x, y] = g.rightHand;
      pen.line(
        [
          [x, y],
          [x + 10, y + 14],
        ],
        4,
        PAL.dark,
        0.1,
      );
      const lens = ell(x - 6, y - 14, 14, 14, 16);
      pen.fill(lens, '#BEDCEE', 0.1, 0.45);
      outline(pen, lens, 3, PAL.dark);
      pen.line(
        [
          [x - 14, y - 20],
          [x - 10, y - 24],
        ],
        2,
        '#FFFFFF',
        0.05,
      );
    },
  },
);
