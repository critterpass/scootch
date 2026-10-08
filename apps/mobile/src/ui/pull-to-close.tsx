import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SPRING_CURVE } from './motion/motion-tokens';
import { touchHaptic } from './motion/press-spring';
import { useFeel } from './motion/use-feel';

// Whether anything moves is decided once, by `useFeel`; the animation does not ask the system.
const ALWAYS = ReduceMotion.Never;
/** How far down, or how fast, a pull has to be to close; and how the screen gives as it goes. */
const PULL = { starts: 14, closesPast: 110, flick: 900, shrinkBy: 0.07, fadeTo: 0.35 } as const;
const OUT_MS = 260;

export interface PullToCloseProps {
  /** What the close control of the screen does. A pull far enough does the same. */
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/**
 * A moment that cannot be swiped back can still be pulled away: drag the screen down and it
 * follows the finger, shrinking and fading a little; let go past the mark, or flick it, and it
 * drops away and closes exactly as its close control would. Anything less springs back. A drag
 * sideways or up is left to whatever is on the screen.
 */
export function PullToClose({ onClose, children }: PullToCloseProps) {
  const { height } = useWindowDimensions();
  const { mayMove, haptics } = useFeel();
  const pulled = useSharedValue(0);
  const felt = () => {
    if (haptics) touchHaptic('choice');
  };

  const pan = usePanGesture({
    activeOffsetY: PULL.starts,
    failOffsetY: -PULL.starts,
    failOffsetX: [-PULL.starts * 2, PULL.starts * 2],
    onUpdate: (event) => {
      'worklet';
      if (mayMove) pulled.value = Math.max(0, event.translationY);
    },
    onDeactivate: (event) => {
      'worklet';
      const closes =
        !event.canceled && (event.translationY > PULL.closesPast || event.velocityY > PULL.flick);
      if (!closes) {
        pulled.value = withSpring(0, { damping: 22, stiffness: 240, reduceMotion: ALWAYS });
        return;
      }
      scheduleOnRN(felt);
      if (!mayMove) {
        scheduleOnRN(onClose);
        return;
      }
      pulled.value = withTiming(
        height,
        { duration: OUT_MS, easing: SPRING_CURVE, reduceMotion: ALWAYS },
        (finished) => {
          if (finished) scheduleOnRN(onClose);
        },
      );
    },
  });

  const giving = useAnimatedStyle(() => {
    const far = Math.min(1, pulled.value / height);
    return {
      // It fades as it goes, and never below the mark while a finger still holds it.
      opacity: Math.max(PULL.fadeTo, 1 - far * 1.4),
      transform: [
        { translateY: pulled.value },
        { scale: 1 - Math.min(far * 2, 1) * PULL.shrinkBy },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, giving]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
