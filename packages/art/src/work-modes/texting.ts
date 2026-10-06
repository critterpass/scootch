import { rr } from '../core/geometry';
import { INK } from '../core/pen';
import { SCOOTCH } from '../scootch/palette';
import { defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL, filled } from '../scootch/work-props';

/**
 * Both thumbs on a phone, message bubbles going up either side. `tap` alternates the thumbs, -1 to
 * 1; `bubbles` is where the messages are, 0 to 1.
 */
export const texting = defineWorkMode(
  { tap: 0, bubbles: 0.35 },
  {
    pose(e, { tap }) {
      e.open = 0.65;
      e.ly = 0.92;
      e.mouth = 'cat';
      e.mx = 0;
      e.hl = [0.24 + tap * 0.03, 0.82];
      e.hr = [0.24 - tap * 0.03, 0.82];
    },
    held(pen, g) {
      const x = g.cx;
      const y = g.cy + g.ry * 0.6;
      pen.fill(rr(x - 12, y, 24, 34, 5), PAL.dark, 0.2);
      pen.fill(rr(x - 9, y + 3, 18, 26, 3), '#EDE6DA', 0.2);
    },
    effect(pen, g, { bubbles }) {
      for (let i = 0; i < 2; i++) {
        const k = phase(bubbles, i * 0.5);
        const x = g.cx + (i ? -58 : 52);
        const y = g.top + 30 - k * 26;
        const alpha = Math.sin(k * Math.PI) * 1.4;
        filled(pen, rr(x - 15, y - 9, 30, 18, 8), i ? SCOOTCH.body : PAL.paper, 1.4, alpha);
        for (let d = 0; d < 3; d++) {
          pen.blot(x - 7 + d * 7, y, 1.8, i ? '#FFFFFF' : INK, 0.05, Math.min(1, alpha));
        }
      }
    },
  },
);
