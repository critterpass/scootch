import { useEffect, useRef } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CROSSFADE_MS, SPRING_CURVE } from '../motion/motion-tokens';
import { useMayMove } from '../motion/use-feel';

/** How long a part takes to glide to its place in a new pose (the Duo board's 700 ms). */
export const GLIDE_MS = 700;

/**
 * A part that changes place when the phone folds glides there instead of jumping: it is laid out
 * at once in its new place, then drawn from where it was back to it with a transform, so nothing
 * inside it is laid out again on the way. Where nothing may move it crossfades instead.
 *
 * `x` and `y` are where the part sits, in window points; `delayMs` lets one part follow another.
 */
export function useGlide(x: number, y: number, delayMs = 0) {
  const mayMove = useMayMove();
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const fade = useSharedValue(1);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const before = last.current;
    last.current = { x, y };
    if (before === null || (before.x === x && before.y === y)) return;
    if (!mayMove) {
      fade.set(
        withSequence(withTiming(0.4, { duration: 0 }), withTiming(1, { duration: CROSSFADE_MS })),
      );
      return;
    }
    const move = { duration: GLIDE_MS, easing: SPRING_CURVE };
    dx.set(withSequence(withTiming(before.x - x, { duration: 0 }), withTiming(0, move)));
    dy.set(withSequence(withTiming(before.y - y, { duration: 0 }), withTiming(0, move)));
    if (delayMs > 0) {
      fade.set(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: delayMs }),
          withTiming(1, { duration: 360 }),
        ),
      );
    }
  }, [x, y, mayMove, delayMs, dx, dy, fade]);

  return useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateX: dx.get() }, { translateY: dy.get() }],
  }));
}
