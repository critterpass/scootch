import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import {
  boardPull,
  boardPullFromDesk,
  boardPullHeld,
  boardPullVelocity,
  deskSheetTop,
  PULL_SETTLE,
  timetablePull,
  timetablePullFromDesk,
  timetablePullHeld,
  timetablePullVelocity,
  timetableTravel,
} from '../../ui/motion/hand-off';
import { touchHaptic } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';

import { BOARD_OPENS_AT, BOARD_TRAVEL } from './pull-release';

/** How far the desk sheet sinks while the board comes down over it, as the App board moves it. */
const SHEET_SINKS = 380;

function clamp01(value: number): number {
  'worklet';
  return Math.max(0, Math.min(1, value));
}

/**
 * The desk's two pulls, on the shared values in `hand-off.ts`. Down on the classroom: the moment
 * the finger takes the pull the board's route opens and draws it from the first point; the desk
 * writes the pull while the finger is on it, and hands the board the finger's speed as it lets go.
 * Up on the desk sheet: the same for the timetable. Each has a tap alternative: the chalkboard,
 * and the sheet's grabber, where the route arrives by itself. Where the board already hangs
 * beside the desk (iPhone Duo opened out) there is no board to pull down.
 */
export function useDeskGestures(enabled: boolean, boardOnPage = false) {
  const router = useRouter();
  const { mayMove, haptics } = useFeel();
  const { height } = useWindowDimensions();
  const insetTop = useSafeAreaInsets().top;

  const openBoard = useCallback(() => {
    if (!boardOnPage) router.push('/board');
  }, [router, boardOnPage]);
  const openTimetable = useCallback(() => router.push('/timetable'), [router]);
  const markFelt = useCallback(() => {
    if (haptics) touchHaptic('primary');
  }, [haptics]);

  // Back at the desk: whatever was pulled is home (the routes leave it there; this is the net).
  useFocusEffect(
    useCallback(() => {
      if (!boardPullHeld.get()) {
        boardPullFromDesk.set(false);
        boardPull.set(mayMove ? withSpring(0, PULL_SETTLE) : 0);
      }
      if (!timetablePullHeld.get()) {
        timetablePullFromDesk.set(false);
        timetablePull.set(mayMove ? withSpring(0, PULL_SETTLE) : 0);
      }
    }, [mayMove]),
  );

  // Whether this pull has passed the board's mark, felt once, on the UI thread with the gesture.
  const marked = useSharedValue(false);
  const pullBoard = useMemo(() => {
    return Gesture.Pan()
      .enabled(enabled && !boardOnPage)
      .activeOffsetY(12)
      .failOffsetY(-12)
      .failOffsetX([-24, 24])
      .onStart(() => {
        marked.set(false);
        boardPullHeld.set(true);
        boardPullFromDesk.set(true);
        scheduleOnRN(openBoard);
      })
      .onUpdate((event) => {
        const pulled = Math.max(0, event.translationY);
        boardPull.set(Math.min(1, pulled / BOARD_TRAVEL));
        if (!marked.get() && pulled >= BOARD_OPENS_AT) {
          marked.set(true);
          scheduleOnRN(markFelt);
        }
      })
      .onEnd((event) => {
        boardPullVelocity.set(event.velocityY / BOARD_TRAVEL);
        boardPullHeld.set(false);
      })
      .onFinalize(() => {
        boardPullHeld.set(false);
      });
  }, [enabled, boardOnPage, openBoard, markFelt, marked]);

  const swipeTimetable = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetY(-10)
        .failOffsetY(10)
        .onBegin((event) => {
          // The sheet's top as it rests, felt under the finger at every touch (the keyboard moves
          // it): where it is on screen, less how far the pulls have moved it.
          const shift =
            clamp01(boardPull.get()) * SHEET_SINKS -
            clamp01(timetablePull.get()) * timetableTravel(height, insetTop);
          deskSheetTop.set(event.absoluteY - event.y - shift);
        })
        .onStart(() => {
          timetablePullHeld.set(true);
          timetablePullFromDesk.set(true);
          scheduleOnRN(openTimetable);
        })
        .onUpdate((event) => {
          timetablePull.set(clamp01(-event.translationY / timetableTravel(height, insetTop)));
        })
        .onEnd((event) => {
          timetablePullVelocity.set(-event.velocityY / timetableTravel(height, insetTop));
          timetablePullHeld.set(false);
        })
        .onFinalize(() => {
          timetablePullHeld.set(false);
        }),
    [enabled, openTimetable, height, insetTop],
  );

  // The sheet follows both pulls: down under the board, up into the timetable's sheet, which
  // takes over from it by the time the timetable's own sheet is whole.
  const sheetStyle = useAnimatedStyle(() => {
    const rising = clamp01(timetablePull.get());
    return {
      opacity: 1 - clamp01((rising - 0.3) / 0.25),
      transform: [
        {
          translateY:
            clamp01(boardPull.get()) * SHEET_SINKS - rising * timetableTravel(height, insetTop),
        },
      ],
    };
  });
  // What sits on the sheet fades as it turns into the timetable.
  const sheetContentStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - timetablePull.get() * 1.8),
  }));

  return { pullBoard, swipeTimetable, openBoard, openTimetable, sheetStyle, sheetContentStyle };
}

export type DeskGestures = ReturnType<typeof useDeskGestures>;
