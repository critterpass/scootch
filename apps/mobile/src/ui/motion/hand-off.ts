import { makeMutable, type SharedValue } from 'react-native-reanimated';

/**
 * What one screen hands the next when a gesture on it opens a route: the gesture's progress as a
 * shared value, and the frame the next screen grows out of. Both screens read and write the same
 * values, so the move never jumps when the route changes under the finger.
 *
 * - The desk owns the pull down. While a finger is on it, it writes `boardPull` and holds
 *   `boardPullHeld`. Past its mark, or on a tap of the chalkboard, it pushes the board.
 * - The board owns everything after that: when the finger lets go it springs `boardPull` open
 *   (1) or back (0), and closing the board runs it back to 0 before the route goes. The desk
 *   draws its own side of the move (the sheet sliding down) from the same value.
 * - The timetable works the same way from the swipe up on the desk sheet.
 */

/** A rectangle in window points. */
export interface Frame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The pull down on the desk: 0 at rest, 1 with the board full screen. */
export const boardPull: SharedValue<number> = makeMutable(0);

/** True while a finger is still on the desk's pull; the board follows it until it lets go. */
export const boardPullHeld: SharedValue<boolean> = makeMutable(false);

/** The chalkboard behind him on the desk, as laid out there; null until the desk has drawn it. */
export const chalkboardFrame: SharedValue<Frame | null> = makeMutable<Frame | null>(null);

/** The swipe up on the desk sheet: 0 at rest, 1 with the timetable open. */
export const timetablePull: SharedValue<number> = makeMutable(0);

/** True while a finger is still on the desk sheet's swipe up. */
export const timetablePullHeld: SharedValue<boolean> = makeMutable(false);

/** The desk's task card, for the move that keeps it at the top of the timetable. */
export const taskCardFrame: SharedValue<Frame | null> = makeMutable<Frame | null>(null);

/**
 * How far the board's list is scrolled. The board is a screen of its own on a phone and a page
 * beside the desk on iPhone Duo opened out; whichever shows it next starts where it was left.
 */
export const boardScroll: SharedValue<number> = makeMutable(0);
