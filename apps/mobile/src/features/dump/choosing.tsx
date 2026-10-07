import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import {
  ANSWER_FADE_MS,
  ANSWER_RISE,
  ANSWER_RISE_MS,
  choosingTimeline,
  LIGHT_MS,
  WORDS_OUT_MS,
  type ChoosingScript,
} from './choosing-script';
import { ChosenWord, FallingWord, WORD_SIZE } from './choosing-word';

/** The answer lands a little past its place and settles, as the board's curve has it. */
const RISE = Easing.bezierFn(0.2, 1.3, 0.4, 1);

export interface ChoosingProps {
  /** What to play; `null` when there is nothing of the one thing to show. */
  readonly script: ChoosingScript | null;
  /** The reveal has not been seen for this one thing yet. */
  readonly playing: boolean;
  /** Called once, as the words give way to the one thing (or at once, where nothing may move). */
  readonly onDone: () => void;
  /** The one thing as it stands afterwards: its label, the headline and Scootch's line. */
  readonly children: ReactNode;
}

/**
 * "Choosing": the person's words arrive one by one, the one thing lights up, every other word
 * blurs, drifts and falls away, and the one thing rises into its place as the headline. It plays
 * once, for spoken and typed words alike, entirely on the UI thread; a tap skips it; where
 * nothing may move it does not play and the one thing is simply there. A screen reader hears one
 * sentence for the whole of it.
 */
export function Choosing({ script: given, playing, onDone, children }: ChoosingProps) {
  const { palette, allowFontScaling, size, reducedMotion, captured } = useScreenStyle();
  const t = useT();
  // Decided once, as it appears: a change of props mid-way never restarts or cuts the reveal.
  const [script] = useState(playing ? given : null);
  const [plays] = useState(script !== null && !reducedMotion && !captured);
  // A capture holds the lit beat, so it looks the same every time.
  const holds = script !== null && captured;
  const timeline = choosingTimeline(script?.words.length ?? 0);
  const { answerAt, endAt, lightAt } = timeline;

  const clock = useSharedValue(plays ? 0 : holds ? lightAt + LIGHT_MS : endAt);
  // `words`: the reveal is playing and a tap skips it. `answer`: the one thing is rising in and
  // already takes touches. `rest`: only the one thing is left.
  const [beat, setBeat] = useState<'words' | 'answer' | 'rest'>(plays ? 'words' : 'rest');
  const [height, setHeight] = useState(0);
  const [tops, setTops] = useState<Readonly<Record<number, number>>>({});

  const done = useRef(onDone);
  done.current = onDone;
  const told = useRef(false);
  const tell = () => {
    if (told.current) return;
    told.current = true;
    done.current();
  };

  useEffect(() => {
    if (holds) return undefined;
    if (!plays) {
      // Nothing may move, or there is nothing to play: the one thing is simply there.
      if (playing) tell();
      return undefined;
    }
    clock.value = withTiming(endAt, {
      duration: endAt,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    });
    const answer = setTimeout(() => {
      setBeat('answer');
      tell();
    }, answerAt);
    const end = setTimeout(() => setBeat('rest'), endAt);
    return () => {
      clearTimeout(answer);
      clearTimeout(end);
      cancelAnimation(clock);
    };
    // Played once per mount.
  }, []);

  const skip = () => {
    cancelAnimation(clock);
    clock.value = endAt;
    setBeat('rest');
    tell();
  };

  const wordsStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.max(0, (clock.value - answerAt) / WORDS_OUT_MS)),
  }));
  const answerStyle = useAnimatedStyle(() => {
    const since = clock.value - answerAt;
    const risen = RISE(Math.min(1, Math.max(0, since / ANSWER_RISE_MS)));
    return {
      opacity: Math.min(1, Math.max(0, since / ANSWER_FADE_MS)),
      transform: [{ translateY: ANSWER_RISE * (1 - risen) }],
    };
  });

  const shown = script !== null && (holds || beat !== 'rest');
  const { words, from, to } = script ?? { words: [], from: 0, to: 0 };
  const fontSize = size(WORD_SIZE);
  // Where the lit run breaks across lines, each line's piece gets its own rounded ends.
  const onLine = (index: number) => tops[index];
  // The tree is the same before, during and after, so the one thing is never drawn twice or
  // rebuilt, and the space the words took is kept: nothing above it shifts when they go.
  return (
    <View style={{ minHeight: height }}>
      <Animated.View
        pointerEvents={beat === 'words' && !holds ? 'none' : 'auto'}
        style={answerStyle}
      >
        {children}
      </Animated.View>
      {shown ? (
        <Animated.View
          pointerEvents="none"
          onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
          style={[styles.words, wordsStyle]}
        >
          {words.map((text, index) =>
            index >= from && index < to ? (
              <ChosenWord
                key={index}
                text={text}
                index={index}
                clock={clock}
                timeline={timeline}
                ink={palette.ink}
                tomato={palette.tomato}
                onTomato={palette.onTomato}
                opens={index === from || onLine(index) !== onLine(index - 1)}
                closes={index === to - 1 || onLine(index) !== onLine(index + 1)}
                fontSize={fontSize}
                allowFontScaling={allowFontScaling}
                onLayout={(event) => {
                  const top = Math.round(event.nativeEvent.layout.y);
                  setTops((known) => (known[index] === top ? known : { ...known, [index]: top }));
                }}
              />
            ) : (
              <FallingWord
                key={index}
                text={text}
                index={index}
                clock={clock}
                timeline={timeline}
                ink={palette.ink}
                fontSize={fontSize}
                allowFontScaling={allowFontScaling}
              />
            ),
          )}
        </Animated.View>
      ) : null}
      {shown && beat === 'words' && !holds ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('dump.heard')}: ${words.join(' ')}`}
          accessibilityHint={t('dump.skip.hint')}
          onPress={skip}
          testID="dump-reveal"
          style={styles.skip}
        />
      ) : null}
    </View>
  );
}

const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;
const styles = StyleSheet.create({
  skip: FILL,
  words: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
});
