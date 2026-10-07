import { distance, type Point } from './math';

/** Whether a point is inside a drawn loop. */
export function insideLoop([x, y]: Point, loop: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i += 1) {
    const a = loop[i];
    const b = loop[j];
    if (!a || !b) continue;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

/** A drawn line shorter than this many points is a touch, not a loop. */
export const LOOP_LEAST_POINTS = 8;
/** A loop counts as closed when its ends are within this distance of each other. */
export const LOOP_GAP = 110;

/** What a line drawn round (or near) the monster amounts to. */
export function loopDrawn(
  line: readonly Point[],
  monster: Point,
): 'nothing' | 'open' | 'beside' | 'around' {
  const first = line[0];
  const last = line[line.length - 1];
  if (!first || !last || line.length < LOOP_LEAST_POINTS) return 'nothing';
  if (distance(first, last) >= LOOP_GAP) return 'open';
  return insideLoop(monster, line) ? 'around' : 'beside';
}

/** A touch along a swipe: where, and when in milliseconds. */
export type TimedPoint = readonly [number, number, number];

/** A swipe has to cover this much ground at this speed (points a millisecond) to be a swoop. */
export const SWIPE_LEAST_LENGTH = 110;
export const SWIPE_LEAST_SPEED = 0.5;
/** And pass within this distance of the monster. */
export const SWIPE_REACH = 85;

/** What a swipe amounts to: whether it was quick, whether it crossed the monster, and its way. */
export function swipeMade(
  path: readonly TimedPoint[],
  monster: Point,
): { readonly quick: boolean; readonly across: boolean; readonly direction: 1 | -1 } | null {
  const first = path[0];
  const last = path[path.length - 1];
  if (!first || !last || path.length < 3) return null;
  let length = 0;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    if (a && b) length += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const took = Math.max(1, last[2] - first[2]);
  return {
    quick: length > SWIPE_LEAST_LENGTH && length / took > SWIPE_LEAST_SPEED,
    across: path.some(
      (point) => Math.hypot(point[0] - monster[0], point[1] - monster[1]) < SWIPE_REACH,
    ),
    direction: last[0] > first[0] ? 1 : -1,
  };
}

const TURN = Math.PI * 2;
/** The reel lands the monster after this much winding: three full turns. */
export const REEL_NEEDS = TURN * 3;
/** Each sixth of a turn clicks. */
export const REEL_CLICK = Math.PI / 3;

/**
 * How far the reel was wound between two angles of the finger round its hub, in radians. Only
 * winding forwards counts; winding back is nothing, and never undoes what was wound.
 */
export function wound(fromAngle: number, toAngle: number): number {
  const turned = ((toAngle - fromAngle + 3 * Math.PI) % TURN) - Math.PI;
  return Math.max(0, turned);
}

/** Whole turns wound so far, never more than the three it takes. */
export function turnsWound(windings: number): number {
  return Math.min(3, Math.floor(windings / TURN));
}
