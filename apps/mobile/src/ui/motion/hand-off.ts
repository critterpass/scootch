import { useEffect } from 'react';
import {
  Easing,
  makeMutable,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

/**
 * What one screen hands the next when a gesture on it opens a route: the gesture's progress as a
 * shared value, and the frame the next screen grows out of. Both screens read and write the same
 * values, so the move never jumps when the route changes under the finger.
 *
 * - The desk owns the pull down. The moment the finger takes it, the desk pushes the board, which
 *   draws `boardPull` from the first point. While the finger is on it the desk holds
 *   `boardPullHeld`; letting go, it leaves the finger's speed in `boardPullVelocity`, and the board
 *   springs open (1) or back (0) with that speed, leaving once it is back. The desk draws its own
 *   side of the move (the sheet sinking) from the same value.
 * - The timetable works the same way from the swipe up on the desk sheet. The desk sheet and the
 *   timetable's sheet are moved by the same travel, so on screen they are one sheet.
 */

/** A rectangle in window points. */
export interface Frame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The one settle every pull ends in: about 555 ms on the interface curve's feel, with no overshoot,
 * carrying the finger's speed through `velocity` (progress a second). Whether it may move at all is
 * decided once, by `useFeel`, so the spring never asks the system again.
 */
// PULL_SPRING in motion-tokens.ts
export const PULL_SETTLE = {
  duration: 370,
  dampingRatio: 1,
  reduceMotion: ReduceMotion.Never,
} as const;

/** Below this a pull is home, and the route it opened leaves without waiting for the spring's tail. */
export const PULL_GONE = 0.01;

/** The pull down on the desk: 0 at rest, 1 with the board full screen. */
export const boardPull: SharedValue<number> = makeMutable(0);

/** True while a finger is still on the desk's pull; the board follows it until it lets go. */
export const boardPullHeld: SharedValue<boolean> = makeMutable(false);

/** The desk's finger speed as it let go of the pull, in progress a second (down is positive). */
export const boardPullVelocity: SharedValue<number> = makeMutable(0);

/**
 * True from the moment the desk's finger opens the board until the board has arrived: the board
 * then draws the desk's pull and never starts an arrival of its own.
 */
export const boardPullFromDesk: SharedValue<boolean> = makeMutable(false);

/** The chalkboard behind him on the desk, as laid out there; null until the desk has drawn it. */
export const chalkboardFrame: SharedValue<Frame | null> = makeMutable<Frame | null>(null);

/** The swipe up on the desk sheet: 0 at rest, 1 with the timetable open. */
export const timetablePull: SharedValue<number> = makeMutable(0);

/** True while a finger is still on the desk sheet's swipe up. */
export const timetablePullHeld: SharedValue<boolean> = makeMutable(false);

/** The finger's speed as it let go of the swipe up, in progress a second (up is positive). */
export const timetablePullVelocity: SharedValue<number> = makeMutable(0);

/** As `boardPullFromDesk`, for the swipe up into the timetable. */
export const timetablePullFromDesk: SharedValue<boolean> = makeMutable(false);

/** The desk's task card, for the move that keeps it at the top of the timetable. */
export const taskCardFrame: SharedValue<Frame | null> = makeMutable<Frame | null>(null);

/** The desk sheet's top edge at rest, in window points, as the desk last felt it under a finger. */
export const deskSheetTop: SharedValue<number | null> = makeMutable<number | null>(null);

/** Where the timetable's sheet stops, below the status bar. */
export function timetableOpenTop(insetTop: number): number {
  'worklet';
  return insetTop + 12;
}

/** The desk sheet's top at rest: as felt, else as the desk laid its card out, else a guess. */
export function deskSheetRestTop(screenHeight: number): number {
  'worklet';
  const felt = deskSheetTop.get();
  if (felt !== null) return felt;
  const card = taskCardFrame.get();
  if (card !== null && card.y < screenHeight) return card.y;
  return screenHeight * 0.55;
}

/**
 * How far the desk sheet rises to become the timetable: from its top at rest to the timetable's
 * top. The desk and the timetable both move the sheet by `progress` times this, so they meet.
 */
export function timetableTravel(screenHeight: number, insetTop: number): number {
  'worklet';
  return Math.max(1, deskSheetRestTop(screenHeight) - timetableOpenTop(insetTop));
}

/**
 * Opened or closed by a tap, with no finger's speed to carry, a route moves on the interface curve
 * as the App board times it: 560 ms down, 520 ms back. A spring is for a finger that let go.
 */
const TAP_OPEN = {
  duration: 560,
  easing: Easing.bezier(0.32, 0.72, 0, 1),
  reduceMotion: ReduceMotion.Never,
} as const;
const TAP_CLOSE = { ...TAP_OPEN, duration: 520 } as const;

function settleTo(to: number, velocity: number) {
  'worklet';
  return withSpring(to, { ...PULL_SETTLE, velocity });
}

/** Where nothing may move, a pull's route fades in and out instead (CSS `ease`). */
const FADE = {
  duration: 200,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  reduceMotion: ReduceMotion.Never,
} as const;

/** A route opened by a finger on the desk, and what it needs to finish that finger's move. */
export interface PullFromDesk {
  readonly held: SharedValue<boolean>;
  readonly fromDesk: SharedValue<boolean>;
  readonly velocity: SharedValue<number>;
  /** Whether it opens as the finger lets go at `progress`, moving `velocity` progress a second. */
  readonly opens: (progress: number, velocity: number) => boolean;
}

/**
 * A route that is drawn from a pull: the board, the timetable and the logbook. It opens and closes
 * with the one settle, carrying a finger's speed, and leaves as soon as the pull is home rather
 * than at the spring's tail. A route the desk's finger opened finishes that finger's move; one
 * opened by a tap arrives by itself. Where nothing may move it cuts behind a 200 ms fade.
 * `dragging` is for the route's own gestures: while it is set the route never leaves.
 */
export function usePullRoute(
  pull: SharedValue<number>,
  mayMove: boolean,
  leave: () => void,
  desk?: PullFromDesk,
) {
  const shown = useSharedValue(1);
  const dragging = useSharedValue(false);
  const left = useSharedValue(false);
  // Waiting for the desk's finger to let go; and whether the pull has been away from home.
  const awaiting = useSharedValue(false);
  const armed = useSharedValue(false);

  const leaveOnce = () => {
    'worklet';
    if (left.get()) return;
    left.set(true);
    scheduleOnRN(leave);
  };
  /**
   * Open, from wherever it is, with a finger's `velocity` (null for a tap); `fade` for an arrival
   * nobody watched being pulled, where nothing may move. Opening or
   * closing ends any wait for the desk's finger, and any drag: the route has its say from then on.
   */
  const open = (velocity: number | null, fade: boolean) => {
    'worklet';
    awaiting.set(false);
    dragging.set(false);
    if (mayMove) {
      pull.set(velocity === null ? withTiming(1, TAP_OPEN) : settleTo(1, velocity));
      return;
    }
    pull.set(1);
    if (fade) {
      shown.set(0);
      shown.set(withTiming(1, FADE));
    }
  };
  const close = (velocity: number | null) => {
    'worklet';
    awaiting.set(false);
    dragging.set(false);
    if (pull.get() < PULL_GONE) {
      pull.set(0);
      leaveOnce();
    } else if (mayMove) {
      pull.set(velocity === null ? withTiming(0, TAP_CLOSE) : settleTo(0, velocity));
    } else {
      shown.set(
        withTiming(0, FADE, (finished) => {
          if (finished !== true) return;
          pull.set(0);
          leaveOnce();
        }),
      );
    }
  };
  const release = () => {
    'worklet';
    if (desk === undefined) return;
    const velocity = desk.velocity.get();
    if (desk.opens(pull.get(), velocity)) open(velocity, false);
    else close(velocity);
  };

  // Arriving: the desk's finger is still on it, or let go before the route was here, or it was a
  // tap. The reaction below reads state, not edges, so a re-render never loses a release.
  // All of it runs on the UI thread, where the gestures and springs write, so nothing reads late.
  const arrive = () => {
    'worklet';
    if (desk !== undefined) {
      const fromDesk = desk.fromDesk.get();
      desk.fromDesk.set(false);
      if (fromDesk) {
        awaiting.set(true);
        return;
      }
    } else if (pull.get() > 0) {
      return;
    }
    open(null, true);
  };
  useEffect(() => {
    scheduleOnUI(arrive);
    // Once, as the route arrives.
  }, []);

  // The desk's hold is read through its own shared value, so the reaction runs when it lets go.
  const held = desk?.held;
  useAnimatedReaction(
    () => ({
      held: held?.get() ?? false,
      away: pull.get() >= PULL_GONE,
      dragging: dragging.get(),
    }),
    (now) => {
      // The desk's finger let go: finish its move.
      if (awaiting.get()) {
        if (!now.held) release();
        return;
      }
      // Home again: off the route, without waiting for the spring's tail.
      if (now.away) armed.set(true);
      else if (armed.get() && !now.dragging) leaveOnce();
    },
  );

  const shownStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));
  /** The route's close for a tap: the same settle, started on the UI thread. */
  const closeFromTap = () => scheduleOnUI(close, null);
  return { open, close, closeFromTap, dragging, shownStyle };
}
