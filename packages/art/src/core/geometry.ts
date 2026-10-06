import type { Path, PathSegment } from './commands';

export type Point = readonly [number, number];

const PI = Math.PI;
const round = (v: number): number => Math.round(v * 100) / 100;
const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

function at(points: readonly Point[], index: number): Point {
  const point = points[index];
  if (point === undefined) throw new RangeError(`no point at ${index}`);
  return point;
}

/** An ellipse as points, optionally wobbly and rotated. */
export function ell(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  n = 20,
  wobble = 0,
  phase = 0,
  rotation = 0,
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    const k = 1 + wobble * (Math.sin(3 * a + phase) * 0.6 + Math.sin(5 * a - phase * 1.3) * 0.4);
    let x = Math.cos(a) * rx * k;
    let y = Math.sin(a) * ry * k;
    if (rotation) {
      const c = Math.cos(rotation);
      const s = Math.sin(rotation);
      [x, y] = [x * c - y * s, x * s + y * c];
    }
    pts.push([cx + x, cy + y]);
  }
  return pts;
}

/** A cubic curve sampled into points. */
export function bez(p0: Point, p1: Point, p2: Point, p3: Point, n = 8): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

/** A closed outline around a centre line, `w0` thick at the start and `w1` at the end. */
export function ribbon(centre: readonly Point[], w0: number, w1: number, bulge = 0): Point[] {
  const left: Point[] = [];
  const right: Point[] = [];
  const n = centre.length - 1;
  centre.forEach((p, i) => {
    const next = at(centre, Math.min(i + 1, n));
    const prev = at(centre, Math.max(i - 1, 0));
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const length = Math.hypot(dx, dy) || 1;
    const f = i / n;
    const th = w0 + (w1 - w0) * f + bulge * Math.sin(PI * f);
    left.push([p[0] - (dy / length) * th, p[1] + (dx / length) * th]);
    right.unshift([p[0] + (dy / length) * th, p[1] - (dx / length) * th]);
  });
  return left.concat(right);
}

/** A rectangle whose corners round off once the outline is smoothed. */
export function rr(x: number, y: number, w: number, h: number, r = 3): Point[] {
  return [
    [x + r, y],
    [x + w - r, y],
    [x + w, y],
    [x + w, y + r],
    [x + w, y + h - r],
    [x + w, y + h],
    [x + w - r, y + h],
    [x + r, y + h],
    [x, y + h],
    [x, y + h - r],
    [x, y + r],
    [x, y],
  ];
}

export function rot(pts: readonly Point[], cx: number, cy: number, angle: number): Point[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}

/** A blob that can taper and peak towards the top and flatten at the bottom. */
export function blobPts(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  n: number,
  shape: { readonly taper: number; readonly peak: number; readonly flat: number },
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    let x = Math.cos(a);
    let y = Math.sin(a);
    if (y < 0) {
      x *= 1 - shape.taper * -y;
      y *= 1 + shape.peak * Math.pow(-y, 3);
    } else y *= shape.flat;
    pts.push([cx + x * rx, cy + y * ry]);
  }
  return pts;
}

export function hexagon(x: number, y: number, r: number): Point[] {
  return Array.from({ length: 6 }, (_, i): Point => {
    const a = (i / 6) * PI * 2;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  });
}

/** Position in a repeating loop, 0 to 1. */
export function loop(t: number, speed: number, offset = 0): number {
  return (((t * speed + offset) % 1) + 1) % 1;
}

/** A closed path that curves through the midpoints, so every corner is soft. */
export function closedPath(pts: readonly Point[]): Path {
  const start = mid(at(pts, pts.length - 1), at(pts, 0));
  const path: PathSegment[] = [['M', round(start[0]), round(start[1])]];
  pts.forEach((p, i) => {
    const m = mid(p, at(pts, (i + 1) % pts.length));
    path.push(['Q', round(p[0]), round(p[1]), round(m[0]), round(m[1])]);
  });
  path.push(['Z']);
  return path;
}

/** An open path: a straight line for two points, a soft curve for more. */
export function openPath(pts: readonly Point[]): Path {
  const first = at(pts, 0);
  const last = at(pts, pts.length - 1);
  const path: PathSegment[] = [['M', round(first[0]), round(first[1])]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = at(pts, i);
    const m = mid(p, at(pts, i + 1));
    path.push(['Q', round(p[0]), round(p[1]), round(m[0]), round(m[1])]);
  }
  path.push(['L', round(last[0]), round(last[1])]);
  return path;
}

/** A closed path with straight edges. */
export function polygonPath(pts: readonly Point[]): Path {
  const path: PathSegment[] = pts.map((p, i): PathSegment => [
    i === 0 ? 'M' : 'L',
    round(p[0]),
    round(p[1]),
  ]);
  path.push(['Z']);
  return path;
}

export function circle(x: number, y: number, r: number): PathSegment {
  return ['O', round(x), round(y), round(r)];
}
