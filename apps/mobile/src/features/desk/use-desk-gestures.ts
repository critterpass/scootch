import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  boardPull,
  boardPullHeld,
  timetablePull,
  timetablePullHeld,
} from '../../ui/motion/hand-off';
import { useMayMove } from '../../ui/motion/use-feel';

/** A sheet's spring after a drag, carrying the finger's speed (the motion skill's table). */
const SETTLE = { duration: 300, dampingRatio: 0.8 } as const;
/** The pulls' travel in points, from rest to fully open, as the App board measures them. */
const TRAVEL = { board: 260, timetable: 464 } as const;
/** Down past this many points, the board opens under the finger. */
const BOARD_OPENS_AT = 90;
/** Up past this share of its travel, the timetable opens. */
const TIMETABLE_OPENS_AT = 0.25;
/** A flick this fast (points a second) opens whatever the distance. */
const FLICK = 600;
/** How far the desk sheet sinks while the board comes down over it, as the App board moves it. */
const SHEET_SINKS = 380;

/**
 * The desk's two pulls, on the shared values in `hand-off.ts`. Down on the classroom: the desk
 * writes `boardPull` while the finger is on it and pushes the board past the mark (or on a flick);
 * from there the board follows the finger and, on release, springs open or back. Up on the desk
 * sheet: the same for the timetable. Short of the mark, the desk springs its pull home. Each has a
 * tap alternative: the chalkboard, and the sheet's grabber.
 */
export function useDeskGestures(enabled: boolean) {
  const router = useRouter();
  const mayMove = useMayMove();

  const openBoard = useCallback(() => router.push('/board'), [router]);
  const openTimetable = useCallback(() => router.push('/timetable'), [router]);

  // Back at the desk: whatever was pulled is home.
  useFocusEffect(
    useCallback(() => {
      if (!boardPullHeld.get()) boardPull.set(mayMove ? withSpring(0, SETTLE) : 0);
      if (!timetablePullHeld.get()) timetablePull.set(mayMove ? withSpring(0, SETTLE) : 0);
    }, [mayMove]),
  );

  // Whether this pull has already pushed the board, on the UI thread with the gesture.
  const pushed = useSharedValue(false);
  const pullBoard = useMemo(() => {
    return Gesture.Pan()
      .enabled(enabled)
      .activeOffsetY(12)
      .failOffsetY(-12)
      .failOffsetX([-24, 24])
      .onStart(() => {
        pushed.set(false);
        boardPullHeld.set(true);
      })
      .onUpdate((event) => {
        const pulled = Math.max(0, event.translationY);
        boardPull.set(Math.min(1, pulled / TRAVEL.board));
        if (!pushed.get() && pulled >= BOARD_OPENS_AT) {
          pushed.set(true);
          scheduleOnRN(openBoard);
        }
      })
      .onEnd((event) => {
        boardPullHeld.set(false);
        if (pushed.get()) return;
        if (event.velocityY >= FLICK) {
          pushed.set(true);
          scheduleOnRN(openBoard);
          return;
        }
        boardPull.set(withSpring(0, { ...SETTLE, velocity: event.velocityY / TRAVEL.board }));
      })
      .onFinalize(() => {
        boardPullHeld.set(false);
      });
  }, [enabled, openBoard, pushed]);

  const swipeTimetable = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetY(-10)
        .failOffsetY(10)
        .onStart(() => {
          timetablePullHeld.set(true);
        })
        .onUpdate((event) => {
          timetablePull.set(Math.min(1, Math.max(0, -event.translationY / TRAVEL.timetable)));
        })
        .onEnd((event) => {
          timetablePullHeld.set(false);
          const share = -event.translationY / TRAVEL.timetable;
          if (share >= TIMETABLE_OPENS_AT || -event.velocityY >= FLICK) {
            timetablePull.set(withSpring(1, SETTLE));
            scheduleOnRN(openTimetable);
            return;
          }
          timetablePull.set(
            withSpring(0, { ...SETTLE, velocity: -event.velocityY / TRAVEL.timetable }),
          );
        })
        .onFinalize(() => {
          timetablePullHeld.set(false);
        }),
    [enabled, openTimetable],
  );

  // The sheet follows both pulls: down under the board, up into the timetable.
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          Math.min(1, Math.max(0, boardPull.get())) * SHEET_SINKS -
          Math.min(1, Math.max(0, timetablePull.get())) * TRAVEL.timetable,
      },
    ],
  }));
  // What sits on the sheet fades as it turns into the timetable.
  const sheetContentStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - timetablePull.get() * 1.8),
  }));

  return { pullBoard, swipeTimetable, openBoard, openTimetable, sheetStyle, sheetContentStyle };
}

export type DeskGestures = ReturnType<typeof useDeskGestures>;
