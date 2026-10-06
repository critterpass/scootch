import type { Point } from '../core/geometry';
import { SCOOTCH } from '../scootch/palette';
import { defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, filled } from '../scootch/work-props';

/**
 * An open book held in both hands. `turn` is a page turning over, 0 to 1, with 0 and 1 a flat
 * book; `nod` is the small bob of the head, -1 to 1.
 */
export const reading = defineWorkMode(
  { turn: 0, nod: 0 },
  {
    pose(e, { nod }) {
      e.open = 0.7;
      e.ly = 0.9;
      e.mouth = 'smile';
      e.mw = 0.5;
      e.hl = [0.62, 0.86];
      e.hr = [0.62, 0.86];
      e.dy = nod * 0.6;
    },
    held(pen, g, { turn }) {
      const cx = g.cx;
      const y = g.by - 2;
      for (const s of [-1, 1]) {
        const cover: Point[] = [
          [cx, y - 16],
          [cx + s * 42, y - 20],
          [cx + s * 44, y + 10],
          [cx, y + 13],
        ];
        pen.fill(cover, SCOOTCH.shade, 0.3);
      }
      for (const s of [-1, 1]) {
        const page: Point[] = [
          [cx, y - 14],
          [cx + s * 38, y - 18],
          [cx + s * 40, y + 7],
          [cx, y + 10],
        ];
        filled(pen, page, PAL.paper, 1.2);
        for (let i = 0; i < 4; i++) {
          pen.line(
            [
              [cx + s * 8, y - 10 + i * 5],
              [cx + s * 32, y - 13 + i * 5],
            ],
            1.2,
            PAL.rule,
            0.1,
          );
        }
      }
      if (turn > 0 && turn < 1) {
        const across = Math.cos(turn * Math.PI);
        const lifted: Point[] = [
          [cx, y - 14],
          [cx + 38 * across, y - 18 - 6 * Math.sin(turn * Math.PI)],
          [cx + 40 * across, y + 7],
          [cx, y + 10],
        ];
        filled(pen, lifted, '#FFFFFF', 1.2);
      }
    },
  },
);
