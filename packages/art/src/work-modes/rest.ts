import { GROUND_Y } from '../core/commands';
import { rot, rr } from '../core/geometry';
import { INK } from '../core/pen';
import { defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, filled, mug, steam } from '../scootch/work-props';

/**
 * A real break: leaning on a pillow, eyes shut, a cup cooling nearby. `breath` is the slow rise
 * and fall, -1 to 1; `steam` is where the steam is, 0 to 1. The drifting letters follow the
 * mood's own beat.
 */
export const rest = defineWorkMode(
  { breath: 0, steam: 0.2 },
  {
    pose(e, { breath }) {
      e.eye = 'closed';
      e.mouth = 'smile';
      e.mw = 0.5;
      e.rot = -0.16;
      e.lean = -6;
      e.dy = 2;
      e.sy -= 0.04 - breath * 0.015;
      e.hl = [0.9, 0.75];
      e.hr = [0.6, 0.86];
      e.fx = 'zzz';
    },
    behind(pen, _g, loop) {
      filled(pen, rot(rr(30, 136, 62, 30, 12), 61, 151, -0.2), PAL.paper);
      pen.line(
        [
          [44, 146],
          [76, 140],
        ],
        1.2,
        PAL.crease,
      );
      pen.line(
        [
          [150, GROUND_Y],
          [196, GROUND_Y],
        ],
        2.6,
        INK,
        0.2,
      );
      mug(pen, 174, GROUND_Y - 1);
      steam(pen, 174, GROUND_Y - 23, 2, loop.steam);
    },
  },
);
