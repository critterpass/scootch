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
