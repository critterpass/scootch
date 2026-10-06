import { ell, rr } from '../core/geometry';
import { INK } from '../core/pen';
import { defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL, desk, filled } from '../scootch/work-props';

const BLACK_KEYS = [1, 2, 4, 5, 6, 8, 9];

/**
 * Eyes shut at a keyboard, notes floating off. `sway` rocks the body, -1 to 1; `left` and `right`
 * lift each hand off the keys, 0 to 1; `notes` is where the notes are, 0 to 1.
 */
export const music = defineWorkMode(
  { sway: 0, left: 0, right: 0, notes: 0.3 },
  {
    pose(e, { sway, left, right }) {
      e.eye = 'closed';
      e.mouth = 'smile';
      e.rot = sway * 0.04;
      e.dy = -Math.abs(sway) * 2;
      e.hl = [0.55, 0.86 - left * 0.08];
      e.hr = [0.55, 0.86 - right * 0.08];
    },
    prop(pen, g) {
      desk(pen, g);
      const x = g.cx - 48;
      filled(pen, rr(x, g.by - 16, 96, 16, 2), PAL.paper, 1.4);
      for (let i = 1; i < 12; i++) {
        pen.line(
          [
            [x + i * 8, g.by - 16],
            [x + i * 8, g.by - 1],
          ],
          1,
          PAL.rule,
          0.05,
        );
      }
      for (const i of BLACK_KEYS) pen.fill(rr(x + i * 8 - 2.5, g.by - 16, 5, 9, 1), PAL.dark, 0.05);
    },
    effect(pen, g, { notes }) {
      for (let i = 0; i < 2; i++) {
        const k = phase(notes, i * 0.5);
        const x = g.cx + (i ? -60 : 56);
        const y = g.top + 40 - k * 40;
        const alpha = Math.min(1, Math.sin(k * Math.PI) * 1.3);
        pen.fill(ell(x, y, 4.5, 3.5, 10, 0, 0, -0.4), INK, 0.1, alpha);
        pen.line(
          [
            [x + 4, y - 1],
            [x + 4, y - 16],
            [x + 10, y - 12],
          ],
          2,
          INK,
          0.1,
          alpha,
        );
      }
    },
  },
);
