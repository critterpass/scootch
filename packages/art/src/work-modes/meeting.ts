import { ell, type Point } from '../core/geometry';
import { defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, laptop } from '../scootch/work-props';

/**
 * A headset with a microphone, at the laptop. `wave` lifts one hand from the keys to wave, 0 to 1;
 * `talk` opens the mouth above a half; `nod` bobs the body, -1 to 1.
 */
export const meeting = defineWorkMode(
  { wave: 0, talk: 0, nod: 0 },
  {
    pose(e, { wave, talk, nod }) {
      e.dy = nod * 1.2;
      e.mouth = talk > 0.5 ? 'o' : 'smile';
      e.mw = 0.7;
      e.open = 0.95;
      e.ly = 0.55;
      e.hl = [0.42, 0.9];
      e.hr = [0.42 + 0.8 * wave, 0.9 - 1.35 * wave];
    },
    accessory(pen, g) {
      const band: Point[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + (i / 12) * Math.PI;
        band.push([g.cx + Math.cos(a) * g.rx * 0.92, g.cy - 4 + Math.sin(a) * g.ry * 1.02]);
      }
      pen.line(band, 4, PAL.dark, 0.15);
      for (const s of [-1, 1]) {
        pen.fill(ell(g.cx + s * g.rx * 0.9, g.cy - 2, 7, 11, 12), PAL.dark, 0.15);
      }
      pen.line(
        [
          [g.cx - g.rx * 0.9, g.cy + 6],
          [g.cx - g.rx * 0.6, g.cy + 22],
          [g.cx - 16, g.cy + 24],
        ],
        2.4,
        PAL.dark,
        0.15,
      );
      pen.blot(g.cx - 15, g.cy + 24, 3.4, PAL.dark);
    },
    prop(pen, g) {
      laptop(pen, g, PAL.grey, () => pen.blot(g.cx, g.by - 16, 1.8, PAL.dark));
    },
  },
);
