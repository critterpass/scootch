import { rot, rr, type Point } from '../core/geometry';
import { INK } from '../core/pen';
import { SCOOTCH } from '../scootch/palette';
import { bothBrows, defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, desk, filled } from '../scootch/work-props';

/**
 * A pen and a page. `stroke` moves the writing hand across, -1 to 1; `written` is how much of the
 * page is filled, 0 to 1.
 */
export const writing = defineWorkMode(
  { stroke: 0, written: 0.65 },
  {
    pose(e, { stroke }) {
      e.open = 0.62;
      e.ly = 0.85;
      e.lx = 0.35;
      e.mouth = 'side';
      e.mx = 0.3;
      e.hl = [0.55, 0.84];
      e.hr = [0.3 + stroke * 0.14, 0.9];
      e.brows = bothBrows(1, 0.18);
    },
    prop(pen, g, { written }) {
      desk(pen, g);
      filled(pen, rot(rr(g.cx - 34, g.by - 20, 68, 24, 2), g.cx, g.by - 8, -0.05), PAL.paper);
      const progress = Math.min(1, Math.max(0, written)) * 4;
      const lines = Math.floor(progress) + 1;
      for (let i = 0; i < Math.min(3, lines); i++) {
        const y = g.by - 15 + i * 6;
        const length = i === lines - 1 ? 40 * (progress % 1) : 44;
        const pts: Point[] = [];
        for (let k = 0; k <= 8; k++) {
          pts.push([g.cx - 28 + (k * length) / 8, y + Math.sin(k * 2 + i) * 1.2]);
        }
        pen.line(pts, 1.4, '#6F6A62', 0.1);
      }
    },
    held(pen, g) {
      const [x, y] = g.rightHand;
      pen.line(
        [
          [x - 2, y - 6],
          [x + 9, y + 12],
        ],
        3.4,
        INK,
        0.1,
      );
      pen.blot(x + 10, y + 13, 1.6, SCOOTCH.body, 0.05);
    },
  },
);
