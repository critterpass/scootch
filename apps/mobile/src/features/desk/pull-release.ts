/**
 * What the desk's two pulls do as the finger lets go, as the App board decides it. Kept apart from
 * the gestures so the decision is the same wherever it is made: the desk, the board, the timetable.
 */

/** The board's pull in points, from rest to fully open. */
export const BOARD_TRAVEL = 260;
/** Down past this many points, the board opens; the pull is felt as it passes. */
export const BOARD_OPENS_AT = 90;
/** Up past this share of its travel, the timetable opens. */
const TIMETABLE_OPENS_AT = 0.25;
/** A flick this fast (points a second) decides whatever the distance. */
const FLICK = 600;

/**
 * Whether the board opens when the finger lets go, `pulled` points down at `velocity` points a
 * second (down is positive): past the mark, or on a flick down. A flick back up keeps it shut.
 */
export function boardOpensOnRelease(pulled: number, velocity: number): boolean {
  'worklet';
  if (velocity >= FLICK) return true;
  return pulled >= BOARD_OPENS_AT && velocity > -FLICK;
}

/**
 * Whether the timetable opens when the finger lets go of the swipe up, `share` of the way up at
 * `velocity` points a second (up is positive): past a quarter, or on a flick up.
 */
export function timetableOpensOnRelease(share: number, velocity: number): boolean {
  'worklet';
  if (velocity >= FLICK) return true;
  return share >= TIMETABLE_OPENS_AT && velocity > -FLICK;
}
