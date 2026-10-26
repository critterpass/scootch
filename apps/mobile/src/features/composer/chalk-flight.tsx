import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useMayMove } from '../../ui/motion/use-feel';
import { ink, type } from '../desk/class-style';

/** The App board's flight: up, shrinking and tipping, onto the chalkboard. */
const FLIGHT_MS = 1100;
const STAGGER_MS = 120;
const ROW = 48;

function Note({
  text,
  index,
  from,
  to,
}: {
  text: string;
  index: number;
  from: number;
  to: number;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(index * STAGGER_MS, withTiming(1, { duration: FLIGHT_MS })));
  }, [progress, index]);
  const top = from + index * ROW;
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    // 0 to 14%: appears; 14% to 62%: flies; then fades where it landed.
    const rise = p < 0.14 ? 0 : Math.min(1, (p - 0.14) / 0.48);
    const eased = 1 - (1 - rise) * (1 - rise);
    return {
      opacity: p < 0.14 ? p / 0.14 : p > 0.62 ? 1 - (p - 0.62) / 0.38 : 1,
      transform: [
        { translateX: 10 * eased },
        { translateY: (to - top) * eased + (p < 0.14 ? 12 * (1 - p / 0.14) : 0) },
        { scale: 1 - 0.45 * eased },
        { rotate: `${-3 * eased}deg` },
      ],
    };
  });
  return (
    <Animated.Text numberOfLines={1} style={[styles.note, type.hand, { top }, style]}>
      {text}
    </Animated.Text>
  );
}

/**
 * Each task just heard flies up from the composer onto the chalkboard as a chalk note. The words
 * are already written on the board by then; this only shows where they went. Nothing flies under
 * Reduce Motion.
 */
export function ChalkFlight({
  notes,
  from,
  to,
}: {
  readonly notes: readonly string[];
  readonly from: number;
  readonly to: number;
}) {
  const mayMove = useMayMove();
  if (!mayMove || notes.length === 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      {notes.map((text, index) => (
        <Note key={`${index}:${text}`} text={text} index={index} from={from} to={to} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    position: 'absolute',
    left: 24,
    maxWidth: 320,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: ink.green,
    color: ink.chalk,
    fontSize: 20,
    boxShadow: '0 8px 20px rgba(20,50,40,0.25)',
  },
});
