import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { CHALK_THROW } from '@phusclass/art/class';

import { useMayMove } from '../../ui/motion/use-feel';

/** The boards place the throw on a 390-point phone. */
const BOARD_WIDTH = 390;
const [c1, c2, c3, c4] = CHALK_THROW.curve;
const THROW_CURVE = Easing.bezier(c1, c2, c3, c4);

/**
 * Pressure 4: a piece of chalk leaves his hand, flies at the screen, misses, and lands in a puff
 * of dust. Played once each time the step is reached. Under Reduce Motion nothing flies.
 */
export function ChalkThrow({
  onThrown,
  top = 0,
}: {
  readonly onThrown?: () => void;
  /** Where the room starts on screen. */
  readonly top?: number;
}) {
  const mayMove = useMayMove();
  const { width } = useWindowDimensions();
  const k = width / BOARD_WIDTH;
  const flight = useSharedValue(0);
  const puff = useSharedValue(0);

  useEffect(() => {
    if (!mayMove) return;
    flight.set(
      withDelay(
        CHALK_THROW.delayMs,
        withTiming(1, { duration: CHALK_THROW.durationMs, easing: THROW_CURVE }),
      ),
    );
    puff.set(
      withDelay(
        CHALK_THROW.puff.delayMs,
        withTiming(1, { duration: CHALK_THROW.puff.durationMs, easing: Easing.out(Easing.quad) }),
      ),
    );
    const timer = setTimeout(() => onThrown?.(), CHALK_THROW.delayMs);
    return () => clearTimeout(timer);
  }, [mayMove, flight, puff, onThrown]);

  const chalk = useAnimatedStyle(() => {
    const f = flight.get();
    return {
      opacity: f > 0 ? 1 : 0,
      transform: [
        { translateX: CHALK_THROW.to.dx * k * f },
        { translateY: CHALK_THROW.to.dy * k * f },
        { scale: 1 + (CHALK_THROW.to.scale - 1) * f },
        { rotate: `${CHALK_THROW.to.rotate * f}deg` },
      ],
    };
  });
  const dust = useAnimatedStyle(() => {
    const p = puff.get();
    return {
      opacity: p === 0 ? 0 : p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75,
      transform: [{ scale: 0.2 + 2 * p }],
    };
  });

  if (!mayMove) return null;
  const { piece, from, puff: spot } = CHALK_THROW;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: from.x * k,
            top: top + from.y * k,
            width: piece.width,
            height: piece.height,
            borderRadius: piece.radius,
            backgroundColor: piece.color,
            boxShadow: '0 1px 0 rgba(0,0,0,0.15)',
          },
          chalk,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: spot.x * k,
            top: top + spot.y * k,
            width: spot.size,
            height: spot.size,
            borderRadius: spot.size / 2,
            backgroundColor: 'rgba(255,255,255,0.7)',
          },
          dust,
        ]}
      />
    </View>
  );
}
