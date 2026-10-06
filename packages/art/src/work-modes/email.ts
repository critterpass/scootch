import { rot, rr } from '../core/geometry';
import { INK } from '../core/pen';
import { defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL, filled, laptop } from '../scootch/work-props';

/** Typing at the laptop while sent envelopes fly off. `fly` is where the envelopes are, 0 to 1. */
export const email = defineWorkMode(
  { fly: 0.2 },
  {
    pose(e) {
      e.mouth = 'tongue';
    },
    prop(pen, g) {
      laptop(pen, g);
    },
    effect(pen, g, { fly }) {
      for (let i = 0; i < 2; i++) {
        const k = phase(fly, i * 0.5);
        const x = g.cx + 24 + k * 58;
        const y = g.by - 40 - k * 92;
        const turn = -0.3 + k * 0.7;
        const alpha = k < 0.75 ? 1 : (1 - k) / 0.25;
        filled(pen, rot(rr(x - 10, y - 7, 20, 14, 2), x, y, turn), PAL.paper, 1.6, alpha);
        const flap = rot(
          [
            [x - 10, y - 7],
            [x, y + 1],
            [x + 10, y - 7],
          ],
          x,
          y,
          turn,
        );
        pen.line(flap, 1.6, INK, 0.15, alpha);
      }
    },
  },
);
