import { rot, rr, type Point } from '../core/geometry';
import { INK } from '../core/pen';
import { bothBrows, defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL } from '../scootch/work-props';

/**
 * A phone at the ear and a free hand that talks along. `talk` opens the mouth above a half;
 * `gesture` moves the free hand and `sway` the body, -1 to 1; `ring` runs the sound waves, 0 to 1.
 */
export const calling = defineWorkMode(
  { talk: 0, gesture: 0, sway: 0, ring: 0 },
  {
    pose(e, { talk, gesture, sway }) {
      e.open = 0.9;
      e.lx = 0.5;
      e.ly = -0.2;
      e.mouth = talk > 0.5 ? 'o' : 'smile';
      e.mw = 0.7;
      e.hr = [1.0, -0.05];
      e.hl = [1.2, 0.3 + gesture * 0.15];
      e.brows = bothBrows(-3, -0.1);
      e.lean = sway * 2;
    },
    held(pen, g) {
      const [x, y] = g.rightHand;
      pen.fill(rot(rr(x - 6, y - 18, 12, 28, 3), x, y - 4, 0.25), PAL.dark, 0.2);
    },
    effect(pen, g, { ring }) {
      const [x, y] = g.rightHand;
      for (let k = 0; k < 2; k++) {
        const radius = 14 + k * 8;
        const pts: Point[] = [];
        for (let i = 0; i <= 6; i++) {
          const a = -0.6 + (i / 6) * 1.2;
          pts.push([x + 6 + Math.cos(a) * radius, y - 8 + Math.sin(a) * radius]);
        }
        pen.line(pts, 2.2, INK, 0.2, 0.3 + 0.7 * phase(ring, 0.99 - k * 0.3));
      }
    },
  },
);
