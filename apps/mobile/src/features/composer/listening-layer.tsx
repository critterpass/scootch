import { useRef } from 'react';
import { StyleSheet, Text, View, type HostInstance, type LayoutChangeEvent } from 'react-native';
import Animated, { withDelay, withTiming, type SharedValue } from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { css } from '../desk/class-motion';
import { ink, type } from '../desk/class-style';

import { heardWordsAt } from './chalk-flight';
import { ListeningDot, VoiceBars } from './voice-bars';

/** Words' line height in the listening panel, at the default text size. */
const WORDS_LINE = 23;
/** A burst of new words comes in one after another, this far apart, as if being said. */
const WORD_STAGGER_MS = 40;
const MAX_WORD_DELAY_MS = 280;
/** A word still being guessed is drawn lighter; it darkens as it settles, 220 ms. */
const GUESSING = 0.5;
const SETTLE_MS = 220;
/** The footer's bars and hint leave when the finger is up, the board's opacity 300 ms. */
const FOOT_MS = 300;

/**
 * The board's `wordA`: each word as it is heard rises 6 points into place, 260 ms ease-out, after
 * `delay` when several arrive at once.
 */
function wordIn(delay: number) {
  return () => {
    'worklet';
    const rise = { duration: 260, easing: css.easeOut };
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 6 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, rise)),
        transform: [{ translateY: withDelay(delay, withTiming(0, rise)) }],
      },
    };
  };
}

/** Where the panel is: hearing, the finger up and the last words settling, or handing them in. */
export type ListeningPhase = 'listening' | 'settling' | 'showing';

/** One word heard: it rises in when new, and darkens from a guess to settled. */
function HeardWord({
  text,
  settled,
  delay,
  mayMove,
  style,
  allowFontScaling,
}: {
  readonly text: string;
  readonly settled: boolean;
  readonly delay: number;
  readonly mayMove: boolean;
  readonly style: object;
  readonly allowFontScaling: boolean;
}) {
  return (
    <Animated.View {...(mayMove ? { entering: wordIn(delay) } : {})}>
      <Animated.Text
        allowFontScaling={allowFontScaling}
        style={[
          style,
          {
            opacity: settled ? 1 : GUESSING,
            transitionProperty: 'opacity',
            transitionDuration: mayMove ? SETTLE_MS : 0,
            transitionTimingFunction: 'ease-out',
          },
        ]}
      >
        {text}
      </Animated.Text>
    </Animated.View>
  );
}

/**
 * The words as they are heard. Each new word rises into place, a burst of them one after another;
 * the phrase still being guessed is lighter until Scribe settles it. Older lines leave at the top.
 */
function HeardWords({
  words,
  pending,
  mayMove,
}: {
  readonly words: string;
  readonly pending: string;
  readonly mayMove: boolean;
}) {
  const sizing = useTextSizing();
  const box = useRef<HostInstance>(null);
  const all = words === '' ? [] : words.split(/\s+/);
  const guessing = pending === '' ? 0 : pending.split(/\s+/).length;
  const firstGuess = all.length - guessing;
  // Words that differ from the last drawing are new: they come in from the first that changed.
  const before = useRef<readonly string[]>([]);
  let firstNew = 0;
  while (firstNew < all.length && before.current[firstNew] === all[firstNew]) firstNew += 1;
  before.current = all;
  const line = sizing.size(WORDS_LINE);
  const word = [type.rounded, styles.words, { fontSize: sizing.size(18), lineHeight: line }];
  // Where the last line sits on screen, so the task can fly up from where it was heard.
  const onLayout = () =>
    box.current?.measureInWindow((x, y, width, height) => {
      heardWordsAt.current = { x, y: y + Math.max(0, height - line), width, height: line };
    });
  return (
    <View ref={box} style={styles.wordsBox} onLayout={onLayout}>
      <View testID="composer-words" accessible accessibilityLabel={words} style={styles.wordsRow}>
        {all.map((one, i) => (
          <HeardWord
            key={`${i}:${one}`}
            text={one}
            settled={i < firstGuess}
            delay={Math.min(MAX_WORD_DELAY_MS, Math.max(0, i - firstNew) * WORD_STAGGER_MS)}
            mayMove={mayMove}
            style={word}
            allowFontScaling={sizing.allowFontScaling}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * The listening panel: the dot, the words as they are heard, the voice and "Let go". When the
 * finger is up he is reading it: the bars and the hint leave, and the words stay on show while the
 * last of them settle and they go to the board.
 */
export function ListeningLayer({
  phase,
  words,
  pending,
  level,
  minHeight,
  mayMove,
  onLayout,
}: {
  readonly phase: ListeningPhase;
  readonly words: string;
  readonly pending: string;
  readonly level?: SharedValue<number>;
  readonly minHeight: number;
  readonly mayMove: boolean;
  readonly onLayout: (e: LayoutChangeEvent) => void;
}) {
  const t = useT();
  const sizing = useTextSizing();
  const hearing = phase === 'listening';
  const footStyle = {
    opacity: hearing ? 1 : 0,
    transitionProperty: 'opacity',
    transitionDuration: mayMove ? FOOT_MS : 0,
    transitionTimingFunction: 'ease',
  } as const;
  return (
    <View style={[styles.listening, { minHeight }]} onLayout={onLayout}>
      <View style={styles.listenHead}>
        {hearing ? <ListeningDot /> : <View style={styles.dotStill} />}
        <Text
          testID="composer-listening-label"
          allowFontScaling={sizing.allowFontScaling}
          style={[type.label, { color: ink.red }]}
        >
          {hearing ? t('composer.listening') : t('desk.thinking')}
        </Text>
      </View>
      <HeardWords words={words} pending={pending} mayMove={mayMove} />
      <Animated.View style={[styles.listenFoot, footStyle]}>
        <VoiceBars {...(level === undefined ? {} : { level })} />
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.hint, { fontSize: sizing.size(12) }]}
        >
          {t('composer.letGo')}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  listening: { paddingVertical: 12, paddingHorizontal: 14, gap: 8 },
  listenHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordsBox: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  wordsRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 5 },
  words: { color: ink.text },
  dotStill: { width: 7, height: 7, borderRadius: 4, backgroundColor: ink.red, opacity: 0.3 },
  listenFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  hint: { color: ink.muted },
});
