import { INK } from '../core/pen';
import { SCOOTCH } from '../scootch/palette';
import { bothBrows, defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL, glasses, laptop } from '../scootch/work-props';

/** Glasses, a dark laptop and braces drifting up. `rise` is where the braces are, 0 to 1. */
export const coding = defineWorkMode(
  { rise: 0.4 },
  {
    pose(e) {
      e.open = 0.5;
      e.ly = 0.78;
      e.mouth = 'flat';
      e.brows = bothBrows(2, 0.22);
    },
    accessory(pen, g) {
      glasses(pen, g);
    },
    prop(pen, g) {
      laptop(pen, g, PAL.dark, () => {
        for (const s of [-1, 1]) {
          pen.line(
            [
              [g.cx + s * 6, g.by - 14],
              [g.cx + s * 10, g.by - 10],
              [g.cx + s * 6, g.by - 6],
            ],
            1.8,
            SCOOTCH.body,
            0.1,
          );
        }
        pen.line(
          [
            [g.cx + 2, g.by - 15],
            [g.cx - 2, g.by - 5],
          ],
          1.8,
          SCOOTCH.body,
          0.1,
        );
      });
    },
    effect(pen, g, { rise }) {
      for (let i = 0; i < 3; i++) {
        const k = phase(rise, i / 3);
        const x = g.cx - 56 + i * 56;
        const y = g.top + 34 - k * 40;
        const s = i === 1 ? -1 : 1;
        pen.line(
          [
            [x + 3 * s, y - 7],
            [x, y - 6],
            [x + s, y - 1],
            [x - 2 * s, y],
            [x + s, y + 1],
            [x, y + 6],
            [x + 3 * s, y + 7],
          ],
          2,
          INK,
          0.1,
          Math.sin(k * Math.PI),
        );
      }
    },
  },
);
