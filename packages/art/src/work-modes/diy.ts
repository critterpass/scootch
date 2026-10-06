import { rot, rr, type Point } from '../core/geometry';
import { defineWorkMode } from '../scootch/work-mode-kit';
import { PAL, desk, filled } from '../scootch/work-props';

const HARD_HAT_SHADE = '#D9A64A';

/** How far the hammer arm is through its swing, 0 to 1, peaking at 0.6 of the loop. */
const swingOf = (hammer: number): number =>
  hammer < 0.6 ? hammer / 0.6 : 1 - (hammer - 0.6) / 0.4;

/**
 * A hard hat, a hammer and a nail in a plank. `hammer` is one blow, 0 to 1; sparks fly around 0.6.
 */
export const diy = defineWorkMode(
  { hammer: 0.3 },
  {
    pose(e, { hammer }) {
      const swing = swingOf(hammer);
      e.hr = [1.02, 0.5 - swing * 0.7];
      e.hl = [0.5, 0.86];
      e.open = hammer > 0.58 && hammer < 0.7 ? 0.25 : 0.8;
      e.mouth = 'tongue';
      e.lx = 0.7;
      e.ly = 0.55;
    },
    accessory(pen, g) {
      const x = g.cx;
      const y = g.cy - g.ry * 0.55;
      const dome: Point[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + (i / 12) * Math.PI;
        dome.push([x + Math.cos(a) * g.rx * 0.8, y + Math.sin(a) * g.ry * 0.55]);
      }
      pen.riso(dome, PAL.gold, HARD_HAT_SHADE, [x, y - 10], 70, 60, { offset: 4, grains: 30 });
      pen.fill(rr(x - g.rx * 0.95, y - 3, g.rx * 1.9, 6, 3), HARD_HAT_SHADE, 0.2);
    },
    prop(pen, g) {
      desk(pen, g);
      filled(pen, rr(g.cx + 34, g.by - 9, 44, 9, 2), PAL.tan, 1.4);
      pen.line(
        [
          [g.cx + 58, g.by - 9],
          [g.cx + 58, g.by - 18],
        ],
        2,
        PAL.dark,
        0.1,
      );
      pen.line(
        [
          [g.cx + 54, g.by - 18],
          [g.cx + 62, g.by - 18],
        ],
        2.4,
        PAL.dark,
        0.1,
      );
    },
    held(pen, g, { hammer }) {
      const [x, y] = g.rightHand;
      const a = -1.6 + swingOf(hammer) * 1.7;
      const hx = x + Math.cos(a) * 24;
      const hy = y + Math.sin(a) * 24;
      pen.line(
        [
          [x, y],
          [hx, hy],
        ],
        3.4,
        PAL.tan,
        0.1,
      );
      pen.fill(rot(rr(hx - 9, hy - 4, 18, 8, 2), hx, hy, a + Math.PI / 2), PAL.dark, 0.1);
    },
    effect(pen, g, { hammer }) {
      if (hammer <= 0.56 || hammer >= 0.74) return;
      const x = g.cx + 58;
      const y = g.by - 22;
      const reach = 8 + (hammer - 0.56) * 30;
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.5;
        pen.line(
          [
            [x + Math.cos(a) * 4, y + Math.sin(a) * 4],
            [x + Math.cos(a) * reach, y + Math.sin(a) * reach],
          ],
          2,
          PAL.gold,
          0.1,
        );
      }
    },
  },
);
