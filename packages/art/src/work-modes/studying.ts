import { rot, rr } from '../core/geometry';
import { SCOOTCH } from '../scootch/palette';
import { bothBrows, defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, desk, filled, glasses } from '../scootch/work-props';

/**
 * Glasses, a pile of books and a highlighter. `scan` moves the marking hand, -1 to 1; `marked` is
 * how far the highlight has run, 0 to 1; `sweat` bobs the worried drop, -1 to 1.
 */
export const studying = defineWorkMode(
  { scan: 0, marked: 0.6, sweat: 0 },
  {
    pose(e, { scan }) {
      e.open = 0.9;
      e.pup = 0.5;
      e.brows = bothBrows(-2, -0.3);
      e.mouth = 'wobble';
      e.ly = 0.7;
      e.hl = [1.1, 0.72];
      e.hr = [0.3 + scan * 0.16, 0.9];
    },
    behind(pen, g) {
      const x = g.cx - g.rx - 30;
      const books = [
        [PAL.dark, 0, 34],
        [SCOOTCH.shade, -3, 32],
        [PAL.leaf, 2, 30],
      ] as const;
      books.forEach(([color, dx, w], i) => {
        filled(pen, rr(x + dx - w / 2, g.by - 11 - i * 11, w, 11, 2), color);
      });
    },
    accessory(pen, g) {
      glasses(pen, g);
    },
    prop(pen, g, { marked }) {
      desk(pen, g);
      filled(pen, rr(g.cx - 30, g.by - 16, 60, 18, 2), PAL.paper, 1.2);
      pen.line(
        [
          [g.cx - 24, g.by - 9],
          [g.cx - 24 + 44 * Math.min(1, Math.max(0, marked)), g.by - 9],
        ],
        6,
        PAL.gold,
        0.1,
        0.55,
      );
    },
    held(pen, g) {
      const [x, y] = g.rightHand;
      pen.fill(rot(rr(x - 3, y - 12, 7, 20, 2), x, y, 0.5), PAL.gold, 0.2);
      pen.blot(x + 6, y + 9, 2.4, PAL.dark, 0.1);
    },
    effect(pen, g, { sweat }) {
      const y = g.top + 20 + sweat * 2;
      pen.fill(
        [
          [g.cx + 54, y - 9],
          [g.cx + 59, y - 1],
          [g.cx + 54, y + 7],
          [g.cx + 49, y - 1],
        ],
        PAL.water,
        0.2,
      );
    },
  },
);
