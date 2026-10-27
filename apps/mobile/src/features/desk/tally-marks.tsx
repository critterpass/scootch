import { Canvas, Path } from '@shopify/react-native-skia';
import { useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useMayMove } from '../../ui/motion/use-feel';

import { curves, ink } from './class-style';

/** The App board's tally: four strokes, and the fifth struck through them. */
export function tallyPath(count: number): string {
  let path = '';
  for (let i = 0; i < Math.min(count, 4); i += 1) path += `M${4 + i * 7} 2 L${6 + i * 7} 14 `;
  if (count >= 5) path += 'M1 12 L30 4 ';
  return path.trim();
}

/**
 * Late slips as red tally marks, read out as a count. A new mark bumps the tally once the slip
 * has gone, as the board's `bumpA`: up to 1.3 and back, 420 ms on the character curve after 600 ms.
 */
export function TallyMarks({ count }: { readonly count: number }) {
  const t = useT();
  const mayMove = useMayMove();
  const bump = useSharedValue(1);
  const last = useRef(count);
  useEffect(() => {
    const grew = count > last.current;
    last.current = count;
    if (!grew || !mayMove) return;
    const step = (to: number, share: number) =>
      withTiming(to, { duration: 420 * share, easing: curves.character });
    bump.set(withDelay(600, withSequence(step(1.3, 0.4), step(1, 0.6))));
  }, [count, mayMove, bump]);
  const bumped = useAnimatedStyle(() => ({ transform: [{ scale: bump.get() }] }));
  if (count <= 0) return null;
  return (
    <Animated.View style={bumped}>
      <Canvas
        style={{ width: 34, height: 16 }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('desk.tallies', { count })}
      >
        <Path
          path={tallyPath(count)}
          style="stroke"
          strokeWidth={2.4}
          strokeCap="round"
          color={ink.red}
        />
      </Canvas>
    </Animated.View>
  );
}
