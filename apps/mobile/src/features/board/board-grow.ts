import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { usePanGesture } from 'react-native-gesture-handler';
import { cancelAnimation, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { logbookPull } from '../logbook/logbook-pull';
import { BOARD_TRAVEL, boardOpensOnRelease } from '../desk/pull-release';
import { goBack } from '../../ui/motion/go-back';
import {
  boardPull,
  boardPullFromDesk,
  boardPullHeld,
  boardPullVelocity,
  chalkboardFrame,
  PULL_GONE,
  usePullRoute,
  type Frame,
  type PullFromDesk,
} from '../../ui/motion/hand-off';
import { touchHaptic } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';

import { BOARD, DESIGN_CHALKBOARD, DESIGN_SCREEN } from './chalk';

export function clamp01(value: number): number {
  'worklet';
  return Math.max(0, Math.min(1, value));
}

/** The desk's pull, as the board finishes it: the same decision the desk's mark makes. */
const FROM_DESK: PullFromDesk = {
  held: boardPullHeld,
  fromDesk: boardPullFromDesk,
  velocity: boardPullVelocity,
  opens: (progress, velocity) => {
    'worklet';
    return boardOpensOnRelease(progress * BOARD_TRAVEL, velocity * BOARD_TRAVEL);
  },
};

/**
 * The board growing out of the chalkboard on the desk. From the desk's first point it follows the
 * pull; when the finger lets go it springs open, or back to the desk, with the finger's speed. The
 * ledge's push, or its tap, springs it back to the chalkboard and the route goes. It is clipped by
 * transforms only: the outer view is scaled down to the clip and the page inside is scaled back
 * up, so no frame lays anything out. Where nothing may move it cuts behind a fade.
 */
export function useBoardGrow(width: number, height: number) {
  const router = useRouter();
  const { mayMove, haptics } = useFeel();

  // Where the board goes once it is back on the desk: the desk, or a route that rises from it.
  const next = useRef<Href | null>(null);
  const leave = useCallback(() => {
    if (next.current !== null) router.replace(next.current);
    else goBack(router, '/');
  }, [router]);
  const route = usePullRoute(boardPull, mayMove, leave, FROM_DESK);

  const feelClose = useCallback(() => {
    if (haptics) touchHaptic('choice');
  }, [haptics]);
  const close = useCallback(() => {
    feelClose();
    route.closeFromTap();
  }, [feelClose, route]);
  /** Back onto the desk, then on to `href`: the timetable rises from the desk sheet. */
  const closeInto = useCallback(
    (href: Href) => {
      next.current = href;
      close();
    },
    [close],
  );

  // Leaving, the board hands the desk back at rest.
  useEffect(
    () => () => {
      cancelAnimation(boardPull);
      boardPull.set(0);
      logbookPull.set(0);
    },
    [],
  );

  // Without a chalkboard published, the one the App board draws on its phone, scaled.
  const fallback = {
    x: (DESIGN_CHALKBOARD.x / DESIGN_SCREEN.width) * width,
    y: (DESIGN_CHALKBOARD.y / DESIGN_SCREEN.height) * height,
    width: (DESIGN_CHALKBOARD.width / DESIGN_SCREEN.width) * width,
    height: (DESIGN_CHALKBOARD.height / DESIGN_SCREEN.height) * height,
  };
  /**
   * The clip's rectangle: the chalkboard at 0, the whole screen at 1. Each style reads the shared
   * values itself and hands them in, so its mapper runs whenever they change.
   */
  const rect = (pulled: number, published: Frame | null) => {
    'worklet';
    const frame = published ?? fallback;
    const rest = 1 - clamp01(pulled);
    const left = frame.x * rest;
    const top = frame.y * rest;
    const w = Math.max(1, width - left - (width - frame.x - frame.width) * rest);
    const h = Math.max(1, height - top - (height - frame.y - frame.height) * rest);
    return { left, top, sx: w / width, sy: h / height };
  };
  // Both views are full screen and scale about their centre (cx, cy), so each translate is
  // corrected for it: the outer view maps a point p to (left, top) + s·p, the inner one undoes it.
  const cx = width / 2;
  const cy = height / 2;
  const clip = useAnimatedStyle(() => {
    const pulled = boardPull.get();
    const { left, top, sx, sy } = rect(pulled, chalkboardFrame.get());
    return {
      // Back on the chalkboard it fades, so he and his words are there again before the route goes.
      opacity: clamp01((pulled - PULL_GONE) / 0.06),
      transform: [
        { translateX: left - cx * (1 - sx) },
        { translateY: top - cy * (1 - sy) },
        { scaleX: sx },
        { scaleY: sy },
      ],
    };
  });
  const inner = useAnimatedStyle(() => {
    const { left, top, sx, sy } = rect(boardPull.get(), chalkboardFrame.get());
    return {
      transform: [
        { translateX: (cx - left) / sx - cx },
        { translateY: (cy - top) / sy - cy },
        { scaleX: 1 / sx },
        { scaleY: 1 / sy },
      ],
    };
  });
  const content = useAnimatedStyle(() => ({ opacity: clamp01((boardPull.get() - 0.15) / 0.45) }));

  // The push up on the ledge, from wherever the board is when the finger takes it.
  const start = useSharedValue(1);
  const ledgePan = usePanGesture({
    activeOffsetY: -8,
    failOffsetX: [-24, 24],
    onActivate: () => {
      'worklet';
      start.set(boardPull.get());
      route.dragging.set(true);
    },
    onUpdate: (event) => {
      'worklet';
      if (mayMove) boardPull.set(clamp01(start.get() + event.translationY / BOARD.closeTravel));
    },
    onDeactivate: (event) => {
      'worklet';
      route.dragging.set(false);
      const velocity = event.velocityY / BOARD.closeTravel;
      const closes =
        !event.canceled &&
        event.velocityY < BOARD.flick &&
        (event.translationY < -BOARD.closesPast || event.velocityY < -BOARD.flick);
      if (closes) {
        scheduleOnRN(feelClose);
        route.close(velocity);
      } else route.open(velocity, false);
    },
    onFinalize: () => {
      'worklet';
      route.dragging.set(false);
    },
  });

  return { clip, inner, content, shown: route.shownStyle, close, closeInto, ledgePan };
}
