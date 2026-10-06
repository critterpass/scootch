import { ell, rr } from '../core/geometry';
import { INK } from '../core/pen';
import { defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL, bubble, filled, outline } from '../scootch/work-props';

/**
 * A plate in one hand and a sponge going round on it. `scrub` is one circle of the sponge, 0 to 1;
 * `bubbles` is where the suds are, 0 to 1; `shine` above a half is the glint of a clean plate.
 */
export const dishes = defineWorkMode(
  { scrub: 0, bubbles: 0.2, shine: 0 },
  {
    pose(e, { scrub }) {
      const a = scrub * Math.PI * 2;
      e.open = 0.7;
      e.ly = 0.6;
      e.mouth = 'smile';
      e.hl = [0.6, 0.76];
      e.hr = [0.18 + Math.cos(a) * 0.12, 0.72 + Math.sin(a) * 0.06];
    },
    held(pen, g, { shine }) {
      const x = g.cx - 4;
      const y = g.cy + g.ry * 0.74;
      filled(pen, ell(x, y, 24, 15, 18), PAL.paper);
      outline(pen, ell(x, y, 15, 9, 16), 1.2, PAL.rule);
      const [sx, sy] = g.rightHand;
      filled(pen, rr(sx - 7, sy - 5, 14, 10, 3), PAL.gold, 1.2);
      if (shine > 0.5) {
        const s = 6;
        pen.line(
          [
            [x - 30 - s, y - 18],
            [x - 30 + s, y - 18],
          ],
          2,
          INK,
        );
        pen.line(
          [
            [x - 30, y - 18 - s],
            [x - 30, y - 18 + s],
          ],
          2,
          INK,
        );
      }
    },
    effect(pen, g, { bubbles }) {
      for (let i = 0; i < 4; i++) {
        const k = phase(bubbles, i / 4);
        bubble(pen, g.cx + 20 + Math.sin(i * 2) * 10, g.cy + 20 - k * 60, 3 + (i % 2) * 2, 1 - k);
      }
    },
  },
);
