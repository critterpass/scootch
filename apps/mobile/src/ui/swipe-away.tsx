import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BinIcon } from './icons';
import { plainStyle } from './motion/animated-style';
import { touchHaptic } from './motion/press-spring';
import { removesOnRelease, ROW } from './motion/swipe-motion';
import { useFeel } from './motion/use-feel';
import { useScreenStyle } from './use-screen-style';

const ALWAYS = ReduceMotion.Never;

export interface SwipeAwayProps {
  /** The row has slid off and closed up: it is gone. */
  readonly onGone: () => void;
  /**
   * Which way it goes. `left` is a row removed over its tomato lane. `down` is something put
   * away, not thrown away: it sinks and fades with no lane behind it, and a drag sideways is left
   * to whatever pages it sits on.
   */
  readonly to?: 'left' | 'down';
  /** The corner radius of what is swiped, so the lane behind it has the same shape. */
  readonly radius?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}

/**
 * Something that can be swiped away. To the left it follows the finger over a tomato lane with a
 * bin; downwards it sinks and fades. Past the mark, or on a flick, it goes and its room closes up.
 * Anything less springs back. One tick is felt as it crosses the mark. A drag the other way is
 * left to the list or the pages it sits in.
 */
export function SwipeAway({ onGone, to = 'left', radius = 0, style, children }: SwipeAwayProps) {
  const down = to === 'down';
  const { palette } = useScreenStyle();
  const { mayMove, haptics } = useFeel();
  const wide = useSharedValue(0);
  const tall = useSharedValue(0);
  const slid = useSharedValue(0);
  const gone = useSharedValue(0);

  // How far it has gone, as a negative number either way: to the left, or down.
  const pan = usePanGesture({
    ...(down
      ? {
          activeOffsetY: ROW.takesAfter,
          failOffsetY: -ROW.takesAfter,
          failOffsetX: [-ROW.scrollsAfter, ROW.scrollsAfter] as [number, number],
        }
      : {
          activeOffsetX: [-ROW.takesAfter, ROW.takesAfter] as [number, number],
          failOffsetY: [-ROW.scrollsAfter, ROW.scrollsAfter] as [number, number],
        }),
    onUpdate: (event) => {
      'worklet';
      slid.value = Math.min(0, down ? -event.translationY : event.translationX);
    },
    onDeactivate: (event) => {
      'worklet';
      const far = down ? tall.value : wide.value;
      const velocity = down ? -event.velocityY : event.velocityX;
      if (!event.canceled && removesOnRelease(slid.value, velocity, far)) {
        slid.value = withTiming(-far, { duration: ROW.offMs, reduceMotion: ALWAYS });
        gone.value = withTiming(
          1,
          { duration: mayMove ? ROW.closeMs : 0, reduceMotion: ALWAYS },
          (finished) => {
            if (finished) scheduleOnRN(onGone);
          },
        );
        return;
      }
      slid.value = withSpring(0, { ...ROW.settle, reduceMotion: ALWAYS });
    },
  });
  const tick = () => touchHaptic('choice');
  useAnimatedReaction(
    () => {
      const far = down ? tall.value : wide.value;
      return far > 0 && -slid.value > far * ROW.removesPast;
    },
    (past, before) => {
      if (haptics && past && before === false) scheduleOnRN(tick);
    },
  );

  const closing = useAnimatedStyle(() =>
    gone.value === 0 || tall.value === 0
      ? { opacity: 1 }
      : { height: tall.value * (1 - gone.value), opacity: 1 - gone.value },
  );
  const sliding = useAnimatedStyle(() =>
    down
      ? {
          // Nothing is behind it to slide over, so it thins as it sinks and is gone by the end.
          opacity: tall.value > 0 ? Math.max(0, 1 + slid.value / tall.value) : 1,
          transform: [{ translateY: -slid.value }],
        }
      : { transform: [{ translateX: slid.value }] },
  );
  const lane = useAnimatedStyle(() => ({ opacity: slid.value < 0 ? 1 : 0 }));

  return (
    // Sinking, it is not cut off at its own edge: its shadow, and its way down, stay whole.
    <Animated.View style={[down ? null : styles.clip, plainStyle(style), closing]}>
      <View
        onLayout={(event) => {
          wide.value = event.nativeEvent.layout.width;
          if (gone.value === 0) tall.value = event.nativeEvent.layout.height;
        }}
      >
        {down ? null : (
          <Animated.View
            pointerEvents="none"
            style={[styles.lane, { backgroundColor: palette.tomato, borderRadius: radius }, lane]}
          >
            <BinIcon color={palette.onTomato} />
          </Animated.View>
        )}
        <GestureDetector gesture={pan}>
          <Animated.View style={sliding}>{children}</Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  lane: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 22,
  },
});
