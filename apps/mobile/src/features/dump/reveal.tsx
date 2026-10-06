import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import type { Reveal } from '../../state/day-types';
import { useScreenStyle } from '../../ui/use-screen-style';

const PHRASE_SIZE = 22;
/** The design's timing: phrases arrive one by one, one lights up, the rest fall, the answer rises. */
const STEP_MS = 100;
const BEFORE_LIGHT_MS = 500;
const LIGHT_MS = 350;
const BEFORE_FALL_MS = 900;
const FALL_SPREAD_MS = 380;
const FALL_MS = 900;
const FADE_MS = 700;
const BEFORE_ANSWER_MS = 1500;
/** With Reduce Motion nothing moves: the phrases are shown, then cross-fade to the one thing. */
const STILL_MS = 1200;
const CROSSFADE_MS = 500;

export interface RevealTimeline {
  readonly lightAt: number;
  readonly fallAt: number;
  readonly doneAt: number;
}

/** When each beat of the reveal happens, in milliseconds from its start. */
export function revealTimeline(phrases: number, reducedMotion: boolean): RevealTimeline {
  if (reducedMotion) return { lightAt: 0, fallAt: STILL_MS, doneAt: STILL_MS + CROSSFADE_MS };
  const lightAt = phrases * STEP_MS + BEFORE_LIGHT_MS;
  const fallAt = lightAt + BEFORE_FALL_MS;
  return { lightAt, fallAt, doneAt: fallAt + BEFORE_ANSWER_MS };
}

interface PhraseProps {
  readonly text: string;
  readonly index: number;
  readonly chosen: boolean;
  readonly timeline: RevealTimeline;
  readonly reducedMotion: boolean;
  /** Held on its first beat, for a capture that must look the same every time. */
  readonly held: boolean;
}

function Phrase({ text, index, chosen, timeline, reducedMotion, held }: PhraseProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const shown = useSharedValue(reducedMotion ? 1 : 0);
  const lit = useSharedValue(0);
  const fallen = useSharedValue(0);
  // Each phrase leaves a little after the last, by a fixed amount so a render never changes it.
  const spread = (index * 97) % FALL_SPREAD_MS;
  const lean = ((index * 53) % 40) - 20;

  useEffect(() => {
    if (reducedMotion) {
      if (chosen) lit.value = 1;
      if (held) return;
      shown.value = withDelay(timeline.fallAt, withTiming(0, { duration: CROSSFADE_MS }));
      return;
    }
    shown.value = withDelay(index * STEP_MS, withTiming(1, { duration: 200 }));
    if (chosen) {
      lit.value = withDelay(timeline.lightAt, withTiming(1, { duration: LIGHT_MS }));
      shown.value = withDelay(timeline.doneAt, withTiming(0, { duration: CROSSFADE_MS }));
      return;
    }
    fallen.value = withDelay(
      timeline.fallAt + spread,
      withTiming(1, { duration: FALL_MS, easing: Easing.bezier(0.5, 0, 0.8, 0.4) }),
    );
  }, [chosen, fallen, held, index, lit, reducedMotion, shown, spread, timeline]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value * (1 - Math.min(1, (fallen.value * FALL_MS) / FADE_MS)),
    backgroundColor: interpolateColor(lit.value, [0, 1], ['transparent', palette.tomato]),
    transform: [
      { translateY: fallen.value * (120 + spread / 2) },
      { rotate: `${fallen.value * lean}deg` },
    ],
  }));
  const ink = useAnimatedStyle(() => ({
    color: interpolateColor(lit.value, [0, 1], [palette.ink, palette.page]),
  }));

  return (
    <Animated.View style={[styles.phrase, style]}>
      <Animated.Text
        allowFontScaling={allowFontScaling}
        style={[styles.words, { fontSize: size(PHRASE_SIZE) }, ink]}
      >
        {text}
      </Animated.Text>
    </Animated.View>
  );
}

export interface RevealViewProps {
  readonly reveal: Reveal;
  /** Called once, when the rest has fallen away and the one thing takes the screen. */
  readonly onDone: () => void;
}

/**
 * The brain dump's reveal: what was said, one phrase lit, and everything else falling out of
 * view. A screen reader hears one sentence for the whole of it.
 */
export function RevealView({ reveal, onDone }: RevealViewProps) {
  const { reducedMotion, captured } = useScreenStyle();
  const t = useT();
  const { phrases, chosen } = reveal;
  const timeline = revealTimeline(phrases.length, reducedMotion);
  const { doneAt } = timeline;

  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (captured) return undefined;
    const timer = setTimeout(() => done.current(), doneAt);
    return () => clearTimeout(timer);
  }, [captured, doneAt]);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${t('dump.heard')}: ${phrases.join(', ')}`}
      testID="dump-reveal"
      style={styles.phrases}
    >
      {phrases.map((text, index) => (
        <Phrase
          key={`${index}-${text}`}
          text={text}
          index={index}
          chosen={index === chosen}
          timeline={timeline}
          reducedMotion={reducedMotion}
          held={captured}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  phrases: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  phrase: {
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  words: {
    fontFamily: fonts.body,
    fontWeight: '500',
  },
});
