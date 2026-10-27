import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useMayMove } from '../../ui/motion/use-feel';
import { ink, type } from '../desk/class-style';

/** The App board's flight: up, shrinking and tipping, onto the chalkboard. */
const FLIGHT_MS = 1100;
const STAGGER_MS = 120;
const ROW = 48;
/** The board's `fly` curve, on every segment between its keyframes. */
const FLY = Easing.bezier(0.5, 0, 0.2, 1);
const KEYS = [0, 1, 2, 3];
/** Under Reduce Motion: the board's `fade`. */
const FADE_MS = 360;
/** The note's own inset round its words. */
const NOTE_PAD = { x: 14, y: 8 } as const;

/**
 * Where the last line of heard words was on screen (window points), written by the listening
 * panel as it lays out. The words just heard take off from there, so they seem to leave the panel
 * for the board.
 */
export const heardWordsAt: {
  current: { x: number; y: number; width: number; height: number } | null;
} = { current: null };

/** Where a flight of heard words starts: from the panel's words, or the board's place for them. */
export function flightStart(fallback: { readonly top: number; readonly left: number }): {
  readonly top: number;
  readonly left: number;
} {
  const at = heardWordsAt.current;
  if (at === null) return fallback;
  return { top: at.y - NOTE_PAD.y, left: at.x - NOTE_PAD.x };
}

function Note({
  text,
  index,
  from,
  to,
  left,
}: {
  text: string;
  index: number;
  from: number;
  to: number;
  left: number;
}) {
  const mayMove = useMayMove();
  // Which keyframe the note has reached, 0 to 3. CSS eases each segment on the flight's curve.
  const key = useSharedValue(mayMove ? 0 : 2);
  const shown = useSharedValue(mayMove ? 1 : 0);
  useEffect(() => {
    if (!mayMove) {
      // Under Reduce Motion the note fades onto the board where it lands, and away.
      shown.set(
        withDelay(
          index * STAGGER_MS,
          withSequence(
            withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.ease) }),
            withDelay(FADE_MS, withTiming(0, { duration: FADE_MS })),
          ),
        ),
      );
      return;
    }
    const step = (to: number, share: number) =>
      withTiming(to, { duration: FLIGHT_MS * share, easing: FLY });
    key.set(
      withDelay(index * STAGGER_MS, withSequence(step(1, 0.14), step(2, 0.48), step(3, 0.38))),
    );
  }, [key, shown, index, mayMove]);
  const top = from + index * ROW;
  const style = useAnimatedStyle(() => {
    const k = key.get();
    const at = (values: readonly number[]) => interpolate(k, KEYS, values, Extrapolation.CLAMP);
    return {
      opacity: at([0, 1, 1, 0]) * shown.get(),
      transform: [
        { translateX: at([0, 0, 10, 10]) },
        { translateY: at([12, 0, to - top, to - top]) },
        { scale: at([0.9, 1, 0.55, 0.5]) },
        { rotate: `${at([0, 0, -3, -3])}deg` },
      ],
    };
  });
  return (
    <Animated.Text numberOfLines={1} style={[styles.note, type.hand, { top, left }, style]}>
      {text}
    </Animated.Text>
  );
}

/**
 * Each task just heard flies up from the composer onto the chalkboard as a chalk note. The words
 * are already written on the board by then; this only shows where they went. Under Reduce Motion
 * nothing flies: each note fades in where it lands, and away.
 */
export function ChalkFlight({
  notes,
  from,
  to,
  left = 24,
}: {
  readonly notes: readonly string[];
  readonly from: number;
  readonly to: number;
  readonly left?: number;
}) {
  if (notes.length === 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      {notes.map((text, index) => (
        <Note key={`${index}:${text}`} text={text} index={index} from={from} to={to} left={left} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    position: 'absolute',
    maxWidth: 320,
    paddingVertical: NOTE_PAD.y,
    paddingHorizontal: NOTE_PAD.x,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: ink.green,
    color: ink.chalk,
    fontSize: 20,
    boxShadow: '0 8px 20px rgba(20,50,40,0.25)',
  },
});
