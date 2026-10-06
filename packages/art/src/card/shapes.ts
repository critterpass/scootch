import type { DrawCommand, Path, PathSegment } from '../core/commands';

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A quarter turn around a centre from `start` (in quarter turns from east), as two curves. */
function corner(cx: number, cy: number, r: number, start: number): PathSegment[] {
  const segments: PathSegment[] = [];
  for (let i = 0; i < 2; i++) {
    const from = (start + i / 2) * (Math.PI / 2);
    const mid = from + Math.PI / 8;
    const to = from + Math.PI / 4;
    const reach = r / Math.cos(Math.PI / 8);
    segments.push([
      'Q',
      cx + Math.cos(mid) * reach,
      cy + Math.sin(mid) * reach,
      cx + Math.cos(to) * r,
      cy + Math.sin(to) * r,
    ]);
  }
  return segments;
}

/** A rectangle with rounded corners, as one closed path. */
export function roundRect({ x, y, w, h }: Box, radius: number): Path {
  const r = Math.min(radius, w / 2, h / 2);
  return [
    ['M', x + r, y],
    ['L', x + w - r, y],
    ...corner(x + w - r, y + r, r, -1),
    ['L', x + w, y + h - r],
    ...corner(x + w - r, y + h - r, r, 0),
    ['L', x + r, y + h],
    ...corner(x + r, y + h - r, r, 1),
    ['L', x, y + r],
    ...corner(x + r, y + r, r, 2),
    ['Z'],
  ];
}

export function fill(path: Path, color: string, alpha = 1): DrawCommand {
  return { op: 'fill', path, color, alpha, rule: 'nonzero' };
}

/** A screen of dots on a square grid, as one path of circles, starting half a step in. */
export function dotScreen(box: Box, step: number, radius: number): Path {
  const dots: PathSegment[] = [];
  for (let y = box.y + step / 2; y < box.y + box.h; y += step) {
    for (let x = box.x + step / 2; x < box.x + box.w; x += step) dots.push(['O', x, y, radius]);
  }
  return dots;
}

/** A dashed horizontal rule, as one path of short lines. */
export function dashedRule(x0: number, x1: number, y: number, dash: number, gap: number): Path {
  const path: PathSegment[] = [];
  for (let x = x0; x < x1; x += dash + gap) {
    path.push(['M', x, y], ['L', Math.min(x + dash, x1), y]);
  }
  return path;
}

/** Commands that draw `commands` inside `box`, scaled from a square space of `viewSize`. */
export function placed(
  commands: readonly DrawCommand[],
  box: Box,
  viewSize: number,
): DrawCommand[] {
  const scale = box.w / viewSize;
  return [
    { op: 'save' },
    { op: 'transform', matrix: [scale, 0, 0, scale, box.x, box.y] },
    ...commands,
    { op: 'restore' },
  ];
}

/** The matrix of a turn by `degrees` around a point. */
export function rotation(
  cx: number,
  cy: number,
  degrees: number,
): readonly [number, number, number, number, number, number] {
  const a = (degrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, s, -s, c, cx - cx * c + cy * s, cy - cx * s - cy * c];
}
