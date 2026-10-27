import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';

import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { paper } from '../tuition/receipt-parts';

import type { StripDay } from './timetable-view';

const NEVER = ReduceMotion.Never;
/** CSS `ease`, for colour and opacity. */
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

/** A newly picked day comes in: opacity over 300 ms, up 8 points over 420 ms on the interface curve. */
const dayIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 8 }] },
    animations: {
      opacity: withTiming(1, { duration: 300, easing: EASE, reduceMotion: NEVER }),
      transform: [
        { translateY: withTiming(0, { duration: 420, easing: SPRING_CURVE, reduceMotion: NEVER }) },
      ],
    },
  };
};
/** Where nothing may move, the days only crossfade. */
const calmIn = FadeIn.duration(200).reduceMotion(NEVER);

/** How the day on show comes in, and goes as the next one arrives. */
export function dayBodyMotion(mayMove: boolean) {
  return { entering: mayMove ? dayIn : calmIn, exiting: FadeOut.duration(200).reduceMotion(NEVER) };
}

/** One day in the strip. Picked, its ink comes in over 240 ms. */
function DayChip({
  day,
  onPick,
}: {
  readonly day: StripDay;
  readonly onPick: (date: string) => void;
}) {
  const { size, allowFontScaling } = useScreenStyle();
  const on = useSharedValue(day.selected ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(day.selected ? 1 : 0, { duration: 240, easing: EASE, reduceMotion: NEVER }));
  }, [day.selected, on]);
  const rest = day.weekend ? '#B0A69B' : paper.ink;
  const fill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.get(), [0, 1], ['rgba(28,26,24,0)', paper.ink]),
  }));
  const ink = useAnimatedStyle(
    () => ({ color: interpolateColor(on.get(), [0, 1], [rest, paper.white]) }),
    [rest],
  );
  return (
    <PressSpring
      testID={`timetable-day-${day.date}`}
      accessibilityRole="tab"
      accessibilityLabel={day.spoken}
      accessibilityState={{ selected: day.selected }}
      onPress={() => onPick(day.date)}
      style={styles.day}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.fill, fill]} />
      <Animated.Text
        allowFontScaling={allowFontScaling}
        style={[styles.letter, { fontSize: size(11) }, ink]}
      >
        {day.letter}
      </Animated.Text>
      <Animated.Text
        allowFontScaling={allowFontScaling}
        style={[styles.number, { fontSize: size(17) }, ink]}
      >
        {day.number}
      </Animated.Text>
    </PressSpring>
  );
}

/** The week's days above the timetable, one of them picked. */
export function DayStrip({
  days,
  onPick,
}: {
  readonly days: readonly StripDay[];
  readonly onPick: (date: string) => void;
}) {
  return (
    <View style={styles.strip} accessibilityRole="tablist">
      {days.map((day) => (
        <DayChip key={day.date} day={day} onPick={onPick} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 4, paddingHorizontal: 14 },
  day: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  fill: { borderRadius: 16 },
  letter: { fontWeight: '700', opacity: 0.7 },
  number: { fontWeight: '700', fontVariant: ['tabular-nums'] },
});
