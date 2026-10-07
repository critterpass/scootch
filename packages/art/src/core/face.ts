import { closedPath, ell, type Point } from './geometry';
import type { InkPair } from './inks';
import { INK, WHITE, type Pen } from './pen';
import type { MonsterMouth } from './spec';

const MOUTH_DARK = '#2A1612';

/** How an eye is held: lid, gaze and pupil size. */
export interface EyeLook {
  /** 1 is wide open. */
  readonly open: number;
  /** Slant of the lid. */
  readonly tilt: number;
  /** Sideways gaze, -1 to 1. */
  readonly gaze: number;
  /** Pupil radius as a share of the eye. */
  readonly pupil: number;
  /** Up and down gaze, -1 to 1. Level when absent. */
  readonly gazeY?: number;
}

/** One round eye with a pupil, two glints and a heavy lid in the body's ink. */
export function drawEye(
  pen: Pen,
  look: EyeLook,
  x: number,
  y: number,
  side: -1 | 1,
  r: number,
  lidColor: string,
): void {
  const ew = r * 0.9;
  const eh = r * 1.08 * Math.max(1, look.open);
  const white = ell(x, y, ew, eh, 18);
  pen.fill(white, WHITE, 0.2);
  pen.clipped(closedPath(white), () => {
    const pr = r * look.pupil;
    const px = x + look.gaze * (ew - pr * 0.75) * 0.75;
    const py = y + (look.gazeY ?? 0) * (eh - pr * 0.75) * 0.75;
    pen.fill(ell(px, py, pr * 0.92, pr, 14), INK, 0.15);
    pen.blot(px - pr * 0.34, py - pr * 0.4, pr * 0.32, WHITE, 0.06);
    pen.blot(px + pr * 0.32, py + pr * 0.34, pr * 0.15, WHITE, 0.06);
    if (look.open < 1) {
      const lid = y - eh + 2 * eh * (1 - look.open);
      const inner = lid + look.tilt * eh * 0.55;
      const outer = lid - look.tilt * eh * 0.55;
      const yl = side === 1 ? inner : outer;
      const yr = side === 1 ? outer : inner;
      pen.polygon(
        [
          [x - ew - 4, y - eh - 4],
          [x + ew + 4, y - eh - 4],
          [x + ew + 4, yr],
          [x - ew - 4, yl],
        ],
        lidColor,
      );
      pen.line(
        [
          [x - ew - 2, yl],
          [x + ew + 2, yr],
        ],
        2.6,
        INK,
        0.2,
      );
    }
  });
}

/** An eye shut in sleep: one short curve, dipping in the middle. */
export function drawShutEye(pen: Pen, x: number, y: number, r: number, color: string): void {
  pen.line(
    [
      [x - r * 0.7, y],
      [x, y + r * 0.4],
      [x + r * 0.7, y],
    ],
    2.6,
    color,
  );
}

/** The two mouths a mood puts in place of the monster's own: a sleeper's smile, a nervous wobble. */
export function drawMoodMouth(
  pen: Pen,
  mood: 'caught' | 'nervous',
  x: number,
  y: number,
  mw: number,
  ink: InkPair,
): void {
  const color = ink.light ? INK : WHITE;
  const pts: Point[] =
    mood === 'caught'
      ? [
          [x - mw * 0.5, y],
          [x, y + 4],
          [x + mw * 0.5, y],
        ]
      : [
          [x - mw, y],
          [x - mw * 0.5, y - 3],
          [x, y],
          [x + mw * 0.5, y - 3],
          [x + mw, y],
        ];
  pen.line(pts, 2.6, color);
}

/** The mouth, centred on `x` with its top near `y`. `mw` is half its width. */
export function drawMouth(
  pen: Pen,
  mouth: MonsterMouth,
  x: number,
  y: number,
  mw: number,
  ink: InkPair,
): void {
  const lineColor = ink.light ? INK : WHITE;
  const tooth = (tx: number, half: number, top: number, jitter: number): void =>
    pen.fill(
      [
        [tx - half, top],
        [tx + half, top],
        [tx, y + 8],
      ],
      WHITE,
      jitter,
    );
  switch (mouth) {
    case 'smile': {
      // A lopsided smirk with two teeth showing.
      pen.line(
        [
          [x - mw, y - 1],
          [x, y + 3],
          [x + mw, y - 6],
        ],
        2.6,
        lineColor,
      );
      for (const s of [-0.45, 0.3]) tooth(x + s * mw, 4, y + 1, 0.2);
      break;
    }
    case 'zigzag': {
      // An open grin with a row of zigzag teeth.
      const lips: Point[] = [
        [x - mw, y - 3],
        [x + mw, y - 3],
      ];
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI;
        lips.push([x + Math.cos(a) * mw, y - 3 + Math.sin(a) * mw * 0.7]);
      }
      pen.fill(lips, MOUTH_DARK, 0.2);
      const teeth: Point[] = [];
      for (let i = 0; i <= 6; i++) {
        teeth.push([x - mw * 0.85 + (i * mw * 1.7) / 6, y - 2 + (i % 2 ? 4 : 0)]);
      }
      pen.line(teeth, 1.8, WHITE, 0.1);
      break;
    }
    case 'fangs': {
      pen.line(
        [
          [x - mw * 0.8, y],
          [x + mw * 0.8, y],
        ],
        2.6,
        lineColor,
      );
      for (const s of [-1, 1]) tooth(x + s * mw * 0.4, 3, y, 0.15);
      break;
    }
    case 'gape':
      pen.fill(ell(x, y + 2, 4.5, 5.5, 12), MOUTH_DARK, 0.15);
      break;
    case 'flat':
      // Nearly flat, with a slight wave.
      pen.line(
        [
          [x - mw * 0.8, y + 1],
          [x - mw * 0.3, y - 2],
          [x + mw * 0.2, y + 2],
          [x + mw * 0.8, y - 1],
        ],
        2.6,
        lineColor,
      );
      break;
    case 'frown':
      pen.line(
        [
          [x - mw * 0.6, y + 4],
          [x, y],
          [x + mw * 0.6, y + 4],
        ],
        2.6,
        lineColor,
      );
      break;
  }
}
