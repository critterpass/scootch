import { drop, ell, type Point } from '../core/geometry';
import type { Pen } from '../core/pen';
import { hash } from '../core/rng';
import type { Expression } from './expression';
import { star } from './face';
import { SCOOTCH, scootchInks, type ScootchInks } from './palette';

/** Where the effects hang: the body centre, the line above the curl and the line under the feet. */
export interface EffectFrame {
  readonly cx: number;
  readonly cy: number;
  readonly top: number;
  readonly by: number;
}

const frac = (v: number): number => ((v % 1) + 1) % 1;

/** The plain desk and laptop of the working mood. */
export function drawLaptop(pen: Pen, g: EffectFrame, inks: ScootchInks = scootchInks()): void {
  pen.line(
    [
      [g.cx - 74, g.by],
      [g.cx + 74, g.by],
    ],
    2.6,
    inks.desk,
  );
  pen.fill(
    [
      [g.cx - 24, g.by - 2],
      [g.cx + 24, g.by - 2],
      [g.cx + 21, g.by - 17],
      [g.cx - 21, g.by - 17],
    ],
    SCOOTCH.laptop,
    0.3,
  );
  pen.blot(g.cx + 5, g.by - 10, 2.6, SCOOTCH.body);
}

/**
 * What floats around Scootch. `beat` is the loop position, 0 to 1; at 0 every effect is at a
 * frame that reads on its own. `t` is the seconds the mood has been moving, for the effects that
 * do not loop with the beat (the rain, the falling confetti).
 */
export function drawEffect(
  pen: Pen,
  e: Expression,
  g: EffectFrame,
  beat: number,
  t: number | undefined,
  inks: ScootchInks = scootchInks(),
): void {
  const ink = inks.fx;
  const seconds = t ?? 0;
  switch (e.fx) {
    case 'cloud': {
      const x = g.cx + 4;
      const y = g.top - 2;
      pen.fill(ell(x, y, 26, 11, 14, 0.16, 1), inks.cloud);
      for (let i = 0; i < e.fxCount; i++) {
        const fall = y + 15 + ((seconds * 18 + i * 7) % 16);
        pen.line(
          [
            [x - 12 + i * 12, fall],
            [x - 14 + i * 12, fall + 5],
          ],
          2.2,
          SCOOTCH.water,
        );
      }
      break;
    }
    case 'dots': {
      const shown = (Math.floor(beat * 4) + 3) % 4;
      for (let i = 0; i < shown; i++) pen.blot(g.cx + 58 + i * 10, g.top + 6, 3, ink);
      break;
    }
    case 'waves':
      for (let k = 0; k < e.fxCount; k++) {
        const radius = 10 + k * 9;
        const pts: Point[] = [];
        for (let i = 0; i <= 6; i++) {
          const a = Math.PI - 0.55 + (i / 6) * 1.1;
          pts.push([g.cx - 60 + Math.cos(a) * radius, g.cy + Math.sin(a) * radius]);
        }
        pen.line(pts, 2.4, ink, 0.38, 0.25 + 0.75 * frac(beat + 0.99 - k * 0.33));
      }
      break;
    case 'think': {
      const puffs = [
        [-58, 8, 3],
        [-70, -6, 4.6],
        [-80, -26, 8],
      ] as const;
      puffs.forEach(([dx, dy, r], i) => {
        const alpha = 0.4 + 0.6 * ((Math.cos(beat * Math.PI * 2 - i * 0.6) + 1) / 2);
        pen.fill(ell(g.cx + dx, g.top + dy + 22, r, r, 10), inks.cloud, 0.38, alpha);
      });
      break;
    }
    case 'sweat':
      for (let i = 0; i < e.fxCount; i++) {
        const bobbing = Math.sin(beat * Math.PI * 2 + i) * 2;
        pen.fill(
          drop(g.cx + 48 + i * 13, g.top + 32 + i * 10 + bobbing, 1 - i * 0.3),
          SCOOTCH.water,
          0.2,
        );
      }
      break;
    case 'tears':
      for (let i = 0; i < e.fxCount; i++) {
        const side = i % 2 ? 1 : -1;
        const k = frac(beat + i * 0.5);
        pen.fill(
          drop(g.cx + side * 30 + side * k * 4, g.cy - 2 + k * 30, 0.9 - k * 0.3),
          SCOOTCH.water,
          0.2,
          1 - k * 0.6,
        );
      }
      break;
    case 'stars': {
      const places = [
        [-66, 16, 0],
        [64, 4, 1.4],
        [70, 50, 2.6],
        [-72, 60, 3.6],
      ] as const;
      places.slice(0, e.fxCount).forEach(([dx, dy, phase], i) => {
        const size = 3 + Math.abs(Math.sin(beat * Math.PI * 2 + phase + 0.9)) * 5;
        pen.fill(star(g.cx + dx, g.top + dy, size), i % 2 ? inks.body : ink, 0.1);
      });
      break;
    }
    case 'zzz':
      for (let i = 0; i < e.fxCount; i++) {
        const k = frac(beat + i / e.fxCount);
        const z = 3 + k * 5;
        const x = g.cx + 46 + k * 22;
        const y = g.top + 18 - k * 34;
        pen.line(
          [
            [x - z, y - z],
            [x + z, y - z],
            [x - z, y + z],
            [x + z, y + z],
          ],
          2.4,
          ink,
          0.38,
          Math.min(1, (1 - k) * 2),
        );
      }
      break;
    case 'confetti': {
      // Falls with the clock when there is one, so a piece never jumps as the beat starts over.
      const fallen = seconds > 0 ? seconds : beat * 4;
      for (let i = 0; i < e.fxCount; i++) {
        const x = 100 + (hash(i + 7) * 2 - 1) * 92;
        const speed = 40 + hash(i + 50) * 50;
        const y = ((fallen * speed + hash(i + 99) * 210) % 210) - 10;
        const turn = fallen * (2 + hash(i + 3) * 4) + i;
        const dx = Math.cos(turn) * 4;
        const dy = Math.sin(turn) * 4;
        pen.line(
          [
            [x - dx, y - dy],
            [x + dx, y + dy],
          ],
          3.2,
          i % 3 ? SCOOTCH.body : ink,
          0.2,
        );
      }
      break;
    }
    case 'laptop':
    case null:
      break;
  }
}
