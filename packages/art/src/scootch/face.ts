import { closedPath, ell, type Point } from '../core/geometry';
import type { Pen } from '../core/pen';
import type { Expression } from './expression';
import { SCOOTCH } from './palette';

/** A four-pointed star around a centre. */
export function star(cx: number, cy: number, size: number): Point[] {
  return Array.from({ length: 8 }, (_, i): Point => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const q = i % 2 ? size * 0.3 : size;
    return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
  });
}

/** One eye. `side` is -1 for Scootch's left as drawn, 1 for the right. */
export function drawEye(
  pen: Pen,
  e: Expression,
  x: number,
  y: number,
  side: -1 | 1,
  r: number,
): void {
  const ink = SCOOTCH.ink;
  if (e.eye === 'happy') {
    pen.line(
      [
        [x - r * 0.75, y + r * 0.25],
        [x - r * 0.45, y - r * 0.3],
        [x, y - r * 0.5],
        [x + r * 0.45, y - r * 0.3],
        [x + r * 0.75, y + r * 0.25],
      ],
      3.6,
      ink,
    );
    return;
  }
  if (e.eye === 'closed') {
    pen.line(
      [
        [x - r * 0.75, y],
        [x - r * 0.4, y + r * 0.35],
        [x, y + r * 0.45],
        [x + r * 0.4, y + r * 0.35],
        [x + r * 0.75, y],
      ],
      3.2,
      ink,
    );
    pen.line(
      [
        [x + side * r * 0.72, y + r * 0.05],
        [x + side * r * 1.02, y + r * 0.3],
      ],
      2.2,
      ink,
    );
    return;
  }
  const ew = r * 0.9;
  const eh = r * 1.08 * Math.max(1, e.open);
  const white = ell(x, y, ew, eh, 18);
  pen.fill(white, SCOOTCH.white, 0.2);
  pen.clipped(closedPath(white), () => {
    if (e.eye === 'sparkle') {
      pen.fill(star(x, y, r * 0.72), ink, 0.1);
    } else {
      const pr = r * e.pup;
      const px = x + e.lx * (ew - pr * 0.75) * 0.75;
      const py = y + e.ly * (eh - pr * 0.75) * 0.75;
      pen.fill(ell(px, py, pr * 0.92, pr, 14), ink, 0.15);
      pen.blot(px - pr * 0.34, py - pr * 0.4, pr * (e.gloss ? 0.42 : 0.32), SCOOTCH.white, 0.06);
      pen.blot(px + pr * 0.32, py + pr * 0.34, pr * 0.15, SCOOTCH.white, 0.06);
      if (e.gloss) pen.blot(px + pr * 0.38, py - pr * 0.52, pr * 0.14, SCOOTCH.white, 0.06);
    }
    if (e.open < 1) {
      const lid = y - eh + 2 * eh * (1 - e.open);
      const inner = lid + e.tilt * eh * 0.55;
      const outer = lid - e.tilt * eh * 0.55;
      const yl = side === 1 ? inner : outer;
      const yr = side === 1 ? outer : inner;
      pen.polygon(
        [
          [x - ew - 4, y - eh - 4],
          [x + ew + 4, y - eh - 4],
          [x + ew + 4, yr],
          [x - ew - 4, yl],
        ],
        SCOOTCH.body,
      );
      pen.line(
        [
          [x - ew - 2, yl],
          [x + ew + 2, yr],
        ],
        2.6,
        ink,
        0.2,
      );
    }
  });
}

/** One brow above the eye at `x`, `eyeY`. */
export function drawBrow(
  pen: Pen,
  [lift, slant]: readonly [number, number],
  x: number,
  eyeY: number,
  side: -1 | 1,
  r: number,
): void {
  const y0 = eyeY - r * 1.1 - 7 + lift;
  const half = r * 0.62;
  pen.line(
    [
      [x - half, y0 + side * slant * 6],
      [x, y0 - 1.6],
      [x + half, y0 - side * slant * 6],
    ],
    3.4,
    SCOOTCH.ink,
    0.25,
  );
}

export function drawMouth(pen: Pen, e: Expression, x: number, y: number): void {
  const w = 9 * e.mw;
  const ink = SCOOTCH.ink;
  switch (e.mouth) {
    case 'smile':
      pen.line(
        [
          [x - w, y - 1],
          [x - w * 0.5, y + w * 0.32],
          [x, y + w * 0.45],
          [x + w * 0.5, y + w * 0.32],
          [x + w, y - 1],
        ],
        2.8,
        ink,
      );
      break;
    case 'flat':
      pen.line(
        [
          [x - w * 0.6, y],
          [x + w * 0.6, y + 0.6],
        ],
        2.8,
        ink,
      );
      break;
    case 'side':
      pen.line(
        [
          [x - w * 0.5, y + 1.5],
          [x + w * 0.2, y],
          [x + w * 0.6, y - 1.5],
        ],
        2.8,
        ink,
      );
      break;
    case 'o':
      pen.fill(ell(x, y + 2, w * 0.38, w * 0.5, 12), SCOOTCH.mouth, 0.2);
      break;
    case 'grin': {
      const pts: Point[] = [
        [x - w, y - 2],
        [x - w * 0.5, y - 1],
        [x, y - 0.6],
        [x + w * 0.5, y - 1],
        [x + w, y - 2],
      ];
      for (let i = 1; i < 8; i++) {
        const a = (i / 8) * Math.PI;
        pts.push([x + Math.cos(a) * w, y - 1.5 + Math.sin(a) * w * 1.05]);
      }
      pen.fill(pts, SCOOTCH.mouth, 0.2);
      pen.clipped(closedPath(pts), () => {
        pen.blot(x + w * 0.1, y + w * 0.85, w * 0.58, SCOOTCH.tongue, 0.1);
      });
      break;
    }
    case 'wobble':
      pen.line(
        [
          [x - w * 0.8, y],
          [x - w * 0.4, y - 2.2],
          [x, y + 1],
          [x + w * 0.4, y - 2.2],
          [x + w * 0.8, y],
        ],
        2.6,
        ink,
      );
      break;
    case 'pout':
      pen.line(
        [
          [x - w * 0.45, y + 2.5],
          [x, y - 1.5],
          [x + w * 0.45, y + 2.5],
        ],
        3,
        ink,
      );
      break;
    case 'tongue':
      pen.fill(ell(x + w * 0.38, y + 3.2, 3.6, 4, 10), SCOOTCH.tongue, 0.15);
      pen.line(
        [
          [x - w * 0.55, y],
          [x + w * 0.6, y],
        ],
        2.8,
        ink,
      );
      break;
  }
}
