import { ell, rr } from '../core/geometry';
import { defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, desk, filled, outline } from '../scootch/work-props';

/** A box being taped shut. `tape` pulls the roll of tape away from the box, 0 to 1. */
export const parcel = defineWorkMode(
  { tape: 0.5 },
  {
    pose(e, { tape }) {
      e.open = 0.6;
      e.ly = 0.8;
      e.mouth = 'tongue';
      e.hr = [0.95 + tape * 0.28, 0.62];
      e.hl = [0.25, 0.78];
    },
    prop(pen, g) {
      desk(pen, g);
      const x = g.cx - 8;
      const y = g.by;
      pen.riso(rr(x - 32, y - 34, 64, 34, 2), PAL.card, PAL.cardShade, [x, y - 17], 70, 60, {
        offset: 4,
        grains: 30,
      });
      pen.fill(rr(x - 32, y - 22, 64, 7, 1), PAL.stone, 0.1);
      filled(pen, rr(x + 6, y - 13, 20, 11, 1), PAL.paper, 1);
    },
    held(pen, g) {
      const [x, y] = g.rightHand;
      pen.line(
        [
          [g.cx + 24, g.by - 19],
          [x - 4, y + 2],
        ],
        5,
        PAL.stone,
        0.1,
        0.85,
      );
      outline(pen, ell(x, y, 7, 7, 12), 3, PAL.dark);
    },
  },
);
