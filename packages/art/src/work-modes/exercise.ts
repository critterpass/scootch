import type { Point } from '../core/geometry';
import { bothBrows, defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL } from '../scootch/work-props';

/**
 * A sweatband, pumping arms and flying drops. `stride` swings the arms and lifts the feet, -1 to
 * 1; `sweat` is where the drops are, 0 to 1.
 */
export const exercise = defineWorkMode(
  { stride: 0.7, sweat: 0.3 },
  {
    pose(e, { stride }) {
      e.dy = -Math.abs(stride) * 6;
      e.mouth = 'o';
      e.mw = 0.7;
      e.open = 0.9;
      e.brows = bothBrows(-2, -0.2);
      e.hl = [1.02, 0.32 + stride * 0.3];
      e.hr = [1.02, 0.32 - stride * 0.3];
    },
    accessory(pen, g) {
      const band: Point[] = [];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * 1.12 + (i / 10) * Math.PI * 0.76;
        band.push([g.cx + Math.cos(a) * g.rx * 0.9, g.cy + 6 + Math.sin(a) * g.ry * 0.78]);
      }
      pen.line(band, 6, PAL.dark, 0.15);
      pen.line(
        [
          [g.cx + g.rx * 0.7, g.cy - g.ry * 0.45],
          [g.cx + g.rx * 0.95, g.cy - g.ry * 0.6],
          [g.cx + g.rx * 1.05, g.cy - g.ry * 0.4],
        ],
        3,
        PAL.dark,
        0.15,
      );
    },
    effect(pen, g, { sweat }) {
      for (let i = 0; i < 2; i++) {
        const k = phase(sweat, i * 0.5);
        const s = i ? 1 : -1;
        const x = g.cx + s * (60 + k * 20);
        const y = g.top + 30 - k * 10;
        pen.fill(
          [
            [x, y - 6],
            [x + s * 3, y],
            [x, y + 4],
            [x - s * 3, y],
          ],
          PAL.water,
          0.1,
          1 - k,
        );
      }
    },
  },
);
