import { rr } from '../core/geometry';
import { INK } from '../core/pen';
import { defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL } from '../scootch/work-props';

/**
 * Both arms overhead on a mat, bending from side to side. `bend` is the lean, -1 to 1; `sparkle`
 * is where the little sparkles are, 0 to 1.
 */
export const stretch = defineWorkMode(
  { bend: 0.5, sparkle: 0.3 },
  {
    pose(e, { bend }) {
      e.eye = 'closed';
      e.mouth = 'smile';
      e.rot = bend * 0.12;
      e.lean = bend * 4;
      e.sy += 0.05;
      e.sx -= 0.03;
      e.hl = [0.26, -1.18];
      e.hr = [0.26, -1.18];
    },
    behind(pen) {
      pen.fill(rr(28, 170, 144, 7, 3), PAL.leaf, 0.2);
    },
    effect(pen, g, { sparkle }) {
      for (let i = 0; i < 3; i++) {
        const k = phase(sparkle, i / 3);
        const x = g.cx + (i - 1) * 60;
        const y = g.top + 40 - k * 20;
        const s = 2 + Math.sin(k * Math.PI) * 4;
        const alpha = Math.sin(k * Math.PI);
        pen.line(
          [
            [x - s, y],
            [x + s, y],
          ],
          1.8,
          INK,
          0.38,
          alpha,
        );
        pen.line(
          [
            [x, y - s],
            [x, y + s],
          ],
          1.8,
          INK,
          0.38,
          alpha,
        );
      }
    },
  },
);
