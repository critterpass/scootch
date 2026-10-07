import type { MonsterMood, ScootchMood } from '@scootch/domain';

import { clamp } from './loop-math';

/** How long a tapped character reacts: the design pops Scootch and scares a monster for 1.4 s. */
export const TAP_REACTION_SECONDS = 1.4;

/** True while a tap `since` seconds ago is still being reacted to. `null` is never tapped. */
export function tapReacting(since: number | null): boolean {
  return since !== null && since >= 0 && since < TAP_REACTION_SECONDS;
}

/** The mood Scootch shows `since` seconds after a tap: a short celebration, then its own again. */
export function scootchTapMood(mood: ScootchMood, since: number | null): ScootchMood {
  return tapReacting(since) ? 'celebrating' : mood;
}

/** The mood a monster shows `since` seconds after a tap: it does not like being poked. */
export function monsterTapMood(mood: MonsterMood, since: number | null): MonsterMood {
  return tapReacting(since) ? 'nervous' : mood;
}

/** The design's squash when a character changes mood or work mode: half a second. */
export const MOOD_SQUASH_SECONDS = 0.5;

export interface Squash {
  /** Width and height about the feet; both 1 at rest. */
  readonly scaleX: number;
  readonly scaleY: number;
}

/**
 * The squash `since` seconds after a change: one turn of a sine that dies away, 13% shorter and 9%
 * wider at its deepest. At rest before the change and from half a second on.
 */
export function moodSquash(since: number): Squash {
  'worklet';
  const u = clamp(since / MOOD_SQUASH_SECONDS, 0, 1);
  const wave = Math.sin(u * Math.PI * 2) * (1 - u);
  return { scaleX: 1 + 0.09 * wave, scaleY: 1 - 0.13 * wave };
}

/** Where the eyes are drawn to: a direction, -1 to 1 each way, and how much of it is held. */
export interface Gaze {
  readonly x: number;
  readonly y: number;
  readonly hold: number;
}

export const GAZE_AT_REST: Gaze = { x: 0, y: 0, hold: 0 };

/** Beyond this distance, in points, a point is too far away to look at. */
const GAZE_REACH = 700;
/** The distance at which the eyes are turned all the way. */
const GAZE_FULL = 160;
/** The design eases 18% of the way each frame and lets go by a tenth each frame, at 30 a second. */
const GAZE_FRAMES_PER_SECOND = 30;
const GAZE_EASE = 0.18;
const GAZE_LET_GO = 0.9;
const GAZE_GONE = 0.02;

/**
 * The direction to look in for a point `dx`, `dy` points from the character's face (x to the
 * right, y down), or `null` when it is out of reach. A near point turns the eyes a little, one
 * 160 points away or more turns them fully; up and down count for four fifths.
 */
export function gazeTarget(dx: number, dy: number): { x: number; y: number } | null {
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance >= GAZE_REACH) return null;
  if (distance === 0) return { x: 0, y: 0 };
  const k = Math.min(1, distance / GAZE_FULL);
  return { x: (dx / distance) * k, y: (dy / distance) * k * 0.8 };
}

/**
 * The gaze `dt` seconds on: eased towards `target` while there is one, let go of smoothly when
 * there is none, and exactly at rest once nothing is left of it.
 */
export function easeGaze(gaze: Gaze, target: { x: number; y: number } | null, dt: number): Gaze {
  const frames = Math.max(0, dt) * GAZE_FRAMES_PER_SECOND;
  if (target) {
    const k = 1 - (1 - GAZE_EASE) ** frames;
    return {
      x: gaze.x + (target.x - gaze.x) * k,
      y: gaze.y + (target.y - gaze.y) * k,
      hold: gaze.hold + (1 - gaze.hold) * k,
    };
  }
  const left = GAZE_LET_GO ** frames;
  const hold = gaze.hold * left;
  return hold < GAZE_GONE ? GAZE_AT_REST : { x: gaze.x * left, y: gaze.y * left, hold };
}
