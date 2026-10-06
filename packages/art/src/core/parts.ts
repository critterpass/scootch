import { GROUND_Y } from './commands';
import type { BodyFrame } from './body';
import { ell, ribbon } from './geometry';
import type { InkPair } from './inks';
import type { Pen } from './pen';
import type { MonsterHorns, MonsterLegs } from './spec';

const HORN = '#EDE6DA';
const BULB = '#F2C46B';

/** How far each kind of leg lifts the body off the ground. */
export const LEG_HEIGHT: Record<MonsterLegs, number> = {
  none: 0,
  stick: 12,
  stub: 5,
  roots: 8,
  six: 6,
};

/** Legs, drawn before the body so it sits on top of them. `stickCount` is two or three. */
export function drawLegs(
  pen: Pen,
  legs: MonsterLegs,
  frame: BodyFrame,
  ink: InkPair,
  stickCount: number,
): void {
  const { cx, y0, y1, w, h, t } = frame;
  const base = GROUND_Y;
  switch (legs) {
    case 'none':
      break;
    case 'stick':
      for (let i = 0; i < stickCount; i++) {
        const x = cx - w * 0.3 + i * ((w * 0.6) / (stickCount - 1));
        const lean = i % 2 ? 1 : -1;
        pen.fill(
          ribbon(
            [
              [x, y1 - 4],
              [x + lean * 1.5, (y1 + base) / 2],
              [x + lean * 3, base - 1],
            ],
            3.4,
            3,
          ),
          ink.shade,
        );
      }
      break;
    case 'stub':
      for (const s of [-1, 1]) pen.fill(ell(cx + s * w * 0.24, base - 3, 10, 5.5, 12), ink.shade);
      break;
    case 'roots':
      for (let i = -1; i <= 1; i++) {
        pen.line(
          [
            [cx + i * 10, y1 - 4],
            [cx + i * 14 + Math.sin(t * 2 + i) * 2, y1 + 3],
            [cx + i * 10 - 4, base],
            [cx + i * 18, base + 1],
          ],
          2.2,
          ink.shade,
        );
      }
      break;
    case 'six':
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const y = y0 + h * (0.45 + k * 0.17);
          const swing = Math.sin(t * 8 + k * 2 + s) * 2;
          pen.line(
            [
              [cx + s * w * 0.44, y],
              [cx + s * (w * 0.6 + 4), y + 4 + swing],
              [cx + s * (w * 0.62 + 2), y + 12],
            ],
            2.4,
            ink.shade,
          );
        }
      }
      break;
  }
}

/** A pair of pale horns. */
export function drawHorns(pen: Pen, horns: MonsterHorns, frame: BodyFrame): void {
  if (horns === 'none') return;
  const { cx, y0, w } = frame;
  const tip = horns === 'tall' ? 24 : 14;
  for (const s of [-1, 1]) {
    pen.fill(
      [
        [cx + s * w * 0.18, y0 + 6],
        [cx + s * w * 0.36, y0 + 8],
        [cx + s * w * 0.32, y0 - tip],
      ],
      HORN,
      0.25,
    );
  }
}

/** One antenna is a bobble on a stalk, two are a pair of them, three are a short tuft. */
export function drawAntennae(pen: Pen, count: number, frame: BodyFrame, ink: InkPair): void {
  const { cx, y0, t } = frame;
  const bulb = ink.light ? ink.shade : BULB;
  if (count === 1) {
    const tx = cx + Math.sin(t * 2) * 4;
    pen.line(
      [
        [cx, y0 + 4],
        [cx + 2, y0 - 8],
        [tx, y0 - 18],
      ],
      2.2,
      ink.shade,
    );
    pen.blot(tx, y0 - 18, 4, bulb);
  } else if (count === 2) {
    for (const s of [-1, 1]) {
      pen.line(
        [
          [cx + s * 8, y0 + 4],
          [cx + s * 11, y0 - 8],
          [cx + s * 16, y0 - 17],
        ],
        2.2,
        ink.shade,
      );
      pen.blot(cx + s * 16, y0 - 17, 3.4, bulb);
    }
  } else if (count >= 3) {
    for (let k = -1; k <= 1; k++) {
      pen.line(
        [
          [cx + k * 6, y0 + 4],
          [cx + k * 9, y0 - 8 - (k === 0 ? 4 : 0)],
        ],
        3,
        ink.body,
      );
    }
  }
}
