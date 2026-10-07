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
  /** The corner radius of what is swiped, so the lane behind it has the same shape. */
  readonly radius?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}

/**
 * Something that can be swiped away to the left: it follows the finger over a tomato lane with a
 * bin, and past the mark, or on a flick, slides off and closes up. Anything less springs back. One
 * tick is felt as it crosses the mark. A drag up or down is left to the list it sits in.
 */
export function SwipeAway({ onGone, radius = 0, style, children }: SwipeAwayProps) {
  const { palette } = useScreenStyle();
  const { mayMove, haptics } = useFeel();
  const wide = useSharedValue(0);
  const tall = useSharedValue(0);
  const slid = useSharedValue(0);
  const gone = useSharedValue(0);

  const pan = usePanGesture({
    activeOffsetX: [-ROW.takesAfter, ROW.takesAfter],
    failOffsetY: [-ROW.scrollsAfter, ROW.scrollsAfter],
    onUpdate: (event) => {
      'worklet';
      slid.value = Math.min(0, event.translationX);
    },
    onDeactivate: (event) => {
      'worklet';
      if (!event.canceled && removesOnRelease(slid.value, event.velocityX, wide.value)) {
        slid.value = withTiming(-wide.value, { duration: ROW.offMs, reduceMotion: ALWAYS });
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
    () => wide.value > 0 && -slid.value > wide.value * ROW.removesPast,
    (past, before) => {
      if (haptics && past && before === false) scheduleOnRN(tick);
    },
  );

  const closing = useAnimatedStyle(() =>
    gone.value === 0 || tall.value === 0
      ? { opacity: 1 }
      : { height: tall.value * (1 - gone.value), opacity: 1 - gone.value },
  );
  const sliding = useAnimatedStyle(() => ({ transform: [{ translateX: slid.value }] }));
  const lane = useAnimatedStyle(() => ({ opacity: slid.value < 0 ? 1 : 0 }));

  return (
    <Animated.View style={[styles.clip, plainStyle(style), closing]}>
      <View
        onLayout={(event) => {
          wide.value = event.nativeEvent.layout.width;
          if (gone.value === 0) tall.value = event.nativeEvent.layout.height;
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.lane, { backgroundColor: palette.tomato, borderRadius: radius }, lane]}
        >
          <BinIcon color={palette.onTomato} />
        </Animated.View>
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
