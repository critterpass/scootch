import { useEffect } from 'react';
import {
  ReduceMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
  type WithTimingConfig,
} from 'react-native-reanimated';

/**
 * A shared value that goes to `target` over `ms`, on the UI thread. With `ms` at 0 it is there at
 * once. Each visual property of the dock follows the state through one of these and nothing else.
 */
export function useFollow(
  target: number,
  ms: number,
  easing?: WithTimingConfig['easing'],
): SharedValue<number> {
  const value = useSharedValue(target);
  useEffect(() => {
    value.value =
      ms <= 0
        ? target
        : withTiming(target, {
            duration: ms,
            reduceMotion: ReduceMotion.Never,
            ...(easing ? { easing } : {}),
          });
  }, [value, target, ms, easing]);
  return value;
}

/** A shared value that goes from 0 to 1 once, as the thing it belongs to appears. */
export function useArrive(ms: number, easing?: WithTimingConfig['easing']): SharedValue<number> {
  const value = useSharedValue(ms <= 0 ? 1 : 0);
  useEffect(() => {
    if (ms <= 0) return;
    value.value = withTiming(1, {
      duration: ms,
      reduceMotion: ReduceMotion.Never,
      ...(easing ? { easing } : {}),
    });
  }, [value, ms, easing]);
  return value;
}
