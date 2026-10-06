import { rot, rr } from '../core/geometry';
import { SCOOTCH } from '../scootch/palette';
import { bothBrows, defineWorkMode, phase } from '../scootch/work-mode-kit';
import { PAL, filled, outline } from '../scootch/work-props';

/**
 * A calculator in one hand, a worried finger on it and receipts raining down. `press` taps the
 * finger, 0 to 1; `fall` is where the receipts are, 0 to 1.
 */
export const money = defineWorkMode(
  { press: 0, fall: 0.3 },
  {
    pose(e, { press }) {
      e.open = 0.85;
      e.ly = 0.6;
      e.lx = -0.55;
      e.mouth = 'wobble';
      e.brows = bothBrows(-2, -0.3);
      e.hl = [1.08, 0.55];
      e.hr = [0.55 + press * 0.06, 0.58];
    },
    held(pen, g) {
      const [x, y] = g.leftHand;
      const shell = rr(x - 15, y - 24, 30, 38, 4);
      pen.fill(shell, PAL.grey, 0.2);
      outline(pen, shell, 1.4);
      pen.fill(rr(x - 11, y - 20, 22, 8, 2), PAL.dark, 0.1);
      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) {
          const last = row === 2 && column === 2;
          const key = last ? SCOOTCH.body : PAL.paper;
          pen.blot(x - 8 + column * 8, y - 5 + row * 7, 2.2, key, 0.05);
        }
      }
    },
    effect(pen, _g, { fall }) {
      for (let i = 0; i < 3; i++) {
        const k = phase(fall, i / 3);
        const flutter = Math.sin(k * Math.PI * 2 + i);
        const x = 30 + i * 70 + flutter * 8;
        const y = -10 + k * 170;
        const turn = flutter * 0.5;
        const alpha = k < 0.8 ? 1 : (1 - k) / 0.2;
        filled(pen, rot(rr(x - 5, y - 11, 10, 22, 1), x, y, turn), PAL.paper, 1.2, alpha);
        for (const dy of [-4, 1]) {
          const rule = rot(
            [
              [x - 3, y + dy],
              [x + 3, y + dy],
            ],
            x,
            y,
            turn,
          );
          pen.line(rule, 1, PAL.rule, 0.38, alpha);
        }
      }
    },
  },
);
