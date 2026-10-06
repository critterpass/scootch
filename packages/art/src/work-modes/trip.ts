import { rot, rr, type Point } from '../core/geometry';
import { SCOOTCH } from '../scootch/palette';
import { bothBrows, defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, outline } from '../scootch/work-props';

/**
 * A map held open with a dotted route and a pin. `look` moves the eyes along the route, -1 to 1;
 * `hop` lifts the pin, 0 to 1.
 */
export const trip = defineWorkMode(
  { look: 0.4, hop: 0 },
  {
    pose(e, { look }) {
      e.open = 1;
      e.lx = look * 0.8;
      e.ly = 0.35;
      e.mouth = 'o';
      e.mw = 0.6;
      e.brows = bothBrows(-4, -0.1);
      e.hl = [1.08, 0.66];
      e.hr = [1.08, 0.66];
    },
    held(pen, g, { hop }) {
      const [lx, ly] = g.leftHand;
      const [rx] = g.rightHand;
      const y = ly - 6;
      const map = rot(rr(lx - 6, y, rx - lx + 12, 36, 2), (lx + rx) / 2, y + 18, -0.03);
      pen.fill(map, PAL.paper, 0.3);
      outline(pen, map, 1.4);
      for (let i = 1; i < 4; i++) {
        const x = lx + ((rx - lx) * i) / 4;
        pen.line(
          [
            [x, y],
            [x, y + 35],
          ],
          1,
          PAL.crease,
        );
      }
      const route = Array.from({ length: 11 }, (_, i): Point => [
        lx + 6 + ((rx - lx - 12) * i) / 10,
        y + 26 - Math.sin((i / 10) * Math.PI) * 16 + Math.sin(i * 1.7) * 2,
      ]);
      for (let i = 0; i + 1 < route.length; i += 2) {
        const from = route[i];
        const to = route[i + 1];
        if (from && to) pen.line([from, to], 1.8, SCOOTCH.body, 0.1);
      }
      const end = route[route.length - 1] ?? [rx, y];
      const px = end[0];
      const py = end[1] - 4 - hop * 4;
      pen.fill(
        [
          [px, py + 6],
          [px - 4, py - 2],
          [px, py - 6],
          [px + 4, py - 2],
        ],
        SCOOTCH.body,
        0.1,
      );
      pen.blot(px, py - 2, 1.4, '#FFFFFF', 0.02);
    },
  },
);
