import { ell, rot, rr, type Point } from '../core/geometry';
import { INK } from '../core/pen';
import { SCOOTCH } from '../scootch/palette';
import { defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL, heart } from '../scootch/work-props';

/**
 * A brush in one hand and a happy cat beside it. `brush` strokes the brush hand and `wag` the
 * cat's tail, -1 to 1; `hearts` is where the hearts are, 0 to 1.
 */
export const pets = defineWorkMode(
  { brush: 0, wag: 0, hearts: 0.3 },
  {
    pose(e, { brush }) {
      e.eye = 'happy';
      e.mouth = 'grin';
      e.mw = 0.8;
      e.blush = 1.2;
      e.hr = [1.08 + brush * 0.12, 0.72];
      e.hl = [0.5, 0.85];
    },
    behind(pen, _g, { wag }) {
      const x = 172;
      const y = 170;
      for (const s of [-1, 1]) {
        const ear: Point[] = [
          [x + s * 6, y - 22],
          [x + s * 15, y - 30],
          [x + s * 15, y - 16],
        ];
        pen.fill(ear, PAL.stone, 0.2);
      }
      pen.fill(rot(ell(x + 16, y - 10, 8, 3, 10), x + 10, y - 10, wag * 0.5 - 0.4), PAL.stone, 0.2);
      pen.riso(ell(x, y - 12, 18, 14, 16, 0.1), PAL.stone, '#9E9280', [x, y - 12], 70, 60, {
        offset: 4,
        grains: 20,
      });
      for (const s of [-1, 1]) {
        pen.line(
          [
            [x + s * 7 - 3, y - 15],
            [x + s * 7, y - 17],
            [x + s * 7 + 3, y - 15],
          ],
          1.6,
          INK,
          0.05,
        );
      }
      pen.blot(x, y - 11, 1.6, INK);
    },
    held(pen, g) {
      const [x, y] = g.rightHand;
      pen.fill(rot(rr(x - 3, y - 2, 6, 16, 2), x, y, -0.7), PAL.tan, 0.1);
      pen.fill(rot(rr(x - 8, y - 8, 16, 8, 2), x, y, -0.7), PAL.dark, 0.1);
    },
    effect(pen, _g, { hearts }) {
      for (let i = 0; i < 2; i++) {
        const k = phase(hearts, i * 0.5);
        pen.fill(heart(170 + i * 12 - 6, 140 - k * 40, 0.32), SCOOTCH.body, 0.1, 1 - k);
      }
    },
  },
);
