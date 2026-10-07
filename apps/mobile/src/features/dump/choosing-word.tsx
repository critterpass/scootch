import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { fonts } from '@scootch/tokens';

import {
  ARRIVE_FADE_MS,
  FALL_FADE_MS,
  FALL_MS,
  LIGHT_MS,
  wordFall,
  type ChoosingTimeline,
} from './choosing-script';

export const WORD_SIZE = 22;
const LINE = 1.36;
/**
 * A falling word goes out of focus by swelling a little as it fades: opacity and a transform, so
 * no text is laid out again on any frame. It stands in for the board's 3 px blur.
 */
const SOFT_SWELL = 0.14;
const HIGHLIGHT_RADIUS = 7;
const HIGHLIGHT_PAD = 5;

/** The board's curves, called from the UI thread. */
const EASE = Easing.bezierFn(0.25, 0.1, 0.25, 1);
const FALL = Easing.bezierFn(0.5, 0, 0.8, 0.4);

function part(clock: number, from: number, ms: number): number {
  'worklet';
  return Math.min(1, Math.max(0, (clock - from) / ms));
}

interface WordProps {
  readonly text: string;
  readonly index: number;
  /** Milliseconds since the first word, driven on the UI thread. */
  readonly clock: SharedValue<number>;
  readonly timeline: ChoosingTimeline;
  readonly ink: string;
  readonly fontSize: number;
  readonly allowFontScaling: boolean;
}

/** A word that is not the one thing: it arrives, then blurs, drifts sideways and falls away. */
export function FallingWord({
  text,
  index,
  clock,
  timeline,
  ink,
  fontSize,
  allowFontScaling,
}: WordProps) {
  const { step, fallAt } = timeline;
  const { delay, dx, dy, turn } = wordFall(index);
  const style = useAnimatedStyle(() => {
    const now = clock.value;
    const leaving = fallAt + delay;
    const gone = EASE(part(now, leaving, FALL_FADE_MS));
    const fallen = FALL(part(now, leaving, FALL_MS));
    return {
      opacity: EASE(part(now, index * step, ARRIVE_FADE_MS)) * (1 - gone),
      transform: [
        { translateX: dx * fallen },
        { translateY: dy * fallen },
        { rotate: `${turn * fallen}deg` },
        { scale: 1 + SOFT_SWELL * gone },
      ],
    };
  });
  return (
    <Animated.Text
      allowFontScaling={allowFontScaling}
      style={[styles.word, { color: ink, fontSize, lineHeight: fontSize * LINE }, style]}
    >
      {`${text} `}
    </Animated.Text>
  );
}

interface ChosenProps extends WordProps {
  readonly tomato: string;
  readonly onTomato: string;
  /** This word starts, or ends, the lit run on its line: that end is rounded and padded. */
  readonly opens: boolean;
  readonly closes: boolean;
  readonly onLayout: (event: LayoutChangeEvent) => void;
}

/** A word of the one thing: it arrives with the rest, lights up tomato, and stays. */
export function ChosenWord({
  text,
  index,
  clock,
  timeline,
  ink,
  tomato,
  onTomato,
  opens,
  closes,
  fontSize,
  allowFontScaling,
  onLayout,
}: ChosenProps) {
  const { step, lightAt } = timeline;
  const box = useAnimatedStyle(() => ({
    opacity: clock.value >= index * step ? 1 : 0,
    backgroundColor: interpolateColor(
      part(clock.value, lightAt, LIGHT_MS),
      [0, 1],
      [`${tomato}00`, tomato],
    ),
  }));
  const words = useAnimatedStyle(() => ({
    color: interpolateColor(part(clock.value, lightAt, LIGHT_MS), [0, 1], [ink, onTomato]),
  }));
  return (
    <Animated.View
      onLayout={onLayout}
      style={[styles.lit, opens && styles.opens, closes && styles.closes, box]}
    >
      <Animated.Text
        allowFontScaling={allowFontScaling}
        style={[styles.word, { fontSize, lineHeight: fontSize * LINE }, words]}
      >
        {closes ? text : `${text} `}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  word: {
    fontFamily: fonts.heading,
    fontWeight: '500',
    letterSpacing: -0.22,
  },
  lit: {
    paddingVertical: 1,
    marginVertical: -1,
  },
  opens: {
    paddingLeft: HIGHLIGHT_PAD,
    marginLeft: -HIGHLIGHT_PAD,
    borderTopLeftRadius: HIGHLIGHT_RADIUS,
    borderBottomLeftRadius: HIGHLIGHT_RADIUS,
  },
  closes: {
    paddingRight: HIGHLIGHT_PAD,
    borderTopRightRadius: HIGHLIGHT_RADIUS,
    borderBottomRightRadius: HIGHLIGHT_RADIUS,
    marginRight: 1,
  },
});
