import { rot, rr } from '../core/geometry';
import { bothBrows, defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL, bubble, filled } from '../scootch/work-props';

/**
 * A sponge on a window. `scrub` is one circle of the sponge, 0 to 1; `bubbles` is where the suds
 * are, 0 to 1.
 */
export const cleaning = defineWorkMode(
  { scrub: 0, bubbles: 0.2 },
  {
    pose(e, { scrub }) {
      const a = scrub * Math.PI * 2;
      e.open = 0.6;
      e.tilt = 0.25;
      e.mouth = 'flat';
      e.lx = 0.7;
      e.ly = 0.3;
      e.hr = [1.12 + Math.cos(a) * 0.1, 0.4 + Math.sin(a) * 0.1];
      e.hl = [0.4, 0.9];
      e.brows = bothBrows(2, 0.3);
    },
    behind(pen) {
      filled(pen, rr(156, 70, 42, 90, 2), '#E3EEF4', 1.4);
      pen.line(
        [
          [177, 70],
          [177, 160],
        ],
        1.2,
        PAL.rule,
      );
      pen.line(
        [
          [156, 115],
          [198, 115],
        ],
        1.2,
        PAL.rule,
      );
    },
    held(pen, g) {
      const [x, y] = g.rightHand;
      filled(pen, rot(rr(x - 9, y - 6, 18, 12, 3), x, y, 0.2), PAL.gold, 1.2);
      for (let i = 0; i < 3; i++) pen.blot(x - 4 + i * 4, y - 1 + (i % 2) * 2, 1, '#C9A04E', 0.05);
    },
    effect(pen, g, { bubbles }) {
      const [x, y] = g.rightHand;
      for (let i = 0; i < 4; i++) {
        const k = phase(bubbles, i / 4);
        bubble(pen, x + 8 + Math.sin(i * 3) * 8, y - 6 - k * 40, 3 + (i % 2) * 2, 1 - k);
      }
    },
  },
);
