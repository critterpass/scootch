import { useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@scootch/tokens';

import { CROSSFADE_MS, SPRING_CURVE, TOAST } from './motion-tokens';
import { useMayMove } from './use-feel';

export interface IslandToastProps {
  /** Changes each time there is something new to say: the toast drops again for each. */
  readonly token: string | number;
  /** How long it stays before tucking away, in milliseconds. */
  readonly holdMs?: number;
  readonly testID?: string;
  readonly children: ReactNode;
}

const NEVER = ReduceMotion.Never;

/**
 * The design's toast: it drops from under the Island (from 36 points up, at 0.9), holds, then
 * tucks back up and fades. It floats over the screen and never takes a touch. Where nothing may
 * move it fades in and out in place. It runs on the UI thread.
 */
export function IslandToast({ token, holdMs = TOAST.holdMs, testID, children }: IslandToastProps) {
  const mayMove = useMayMove();
  const insets = useSafeAreaInsets();
  // 0 above and unseen, 1 in place, 2 tucked away again.
  const stage = useSharedValue(0);

  useEffect(() => {
    stage.value = 0;
    stage.value = withSequence(
      withTiming(1, {
        duration: mayMove ? TOAST.inMs : CROSSFADE_MS,
        easing: SPRING_CURVE,
        reduceMotion: NEVER,
      }),
      withDelay(
        holdMs,
        withTiming(2, {
          duration: mayMove ? TOAST.outMs : CROSSFADE_MS,
          easing: SPRING_CURVE,
          reduceMotion: NEVER,
        }),
      ),
    );
    return () => cancelAnimation(stage);
  }, [token, holdMs, mayMove, stage]);

  const dropping = useAnimatedStyle(() => {
    const opacity = interpolate(stage.value, [0, 0.6, 1, 1.5, 2], [0, 1, 1, 1, 0]);
    if (!mayMove) return { opacity, transform: [{ translateY: 0 }, { scale: 1 }] };
    return {
      opacity,
      transform: [
        { translateY: interpolate(stage.value, [0, 1, 2], [TOAST.fromY, 0, TOAST.toY]) },
        { scale: interpolate(stage.value, [0, 1, 2], [TOAST.fromScale, 1, TOAST.toScale]) },
      ],
    };
  }, [mayMove]);

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { top: insets.top + spacing.xs }, dropping]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    zIndex: 10,
  },
});
