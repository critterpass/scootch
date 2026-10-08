import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  withDelay,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';

import { SPRING_CURVE } from './motion-tokens';
import { useMayMove } from './use-feel';

// Whether anything moves is decided once, by `useMayMove`; the animation does not ask again.
const ALWAYS = ReduceMotion.Never;
/** Each word follows the one before by this much; past the tenth they come together. */
const STEP_MS = 36;
const LATEST = 10;

/** One word's way in: up a little and into focus, after the words before it. */
function wordIn(index: number): EntryExitAnimationFunction {
  return () => {
    'worklet';
    const wait = Math.min(index, LATEST) * STEP_MS;
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 12 }] },
      animations: {
        opacity: withDelay(wait, withTiming(1, { duration: 240, reduceMotion: ALWAYS })),
        transform: [
          {
            translateY: withDelay(
              wait,
              withTiming(0, { duration: 460, easing: SPRING_CURVE, reduceMotion: ALWAYS }),
            ),
          },
        ],
      },
    };
  };
}

export interface RisingWordsProps {
  readonly text: string;
  /** The type the words are set in. The size and the line height are read from it. */
  readonly style: TextStyle & { readonly fontSize: number; readonly lineHeight: number };
  readonly allowFontScaling: boolean;
  readonly testID?: string;
}

/**
 * A headline that arrives a word at a time: each word rises a little and comes into view just
 * after the one before, so the sentence lands as it is read. It is read out as one heading, and
 * plays once, as it appears. Where nothing may move it is the plain sentence.
 */
export function RisingWords({ text, style, allowFontScaling, testID }: RisingWordsProps) {
  const mayMove = useMayMove();
  if (!mayMove) {
    return (
      <Text
        accessibilityRole="header"
        allowFontScaling={allowFontScaling}
        style={style}
        testID={testID}
      >
        {text}
      </Text>
    );
  }
  const words = text.trim().split(/\s+/u).filter(Boolean);
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={text}
      testID={testID}
      // The space between words, as the type itself would set it.
      style={[styles.line, { columnGap: style.fontSize * 0.25 }]}
    >
      {words.map((word, index) => (
        <Animated.Text
          key={`${index}:${word}`}
          entering={wordIn(index)}
          allowFontScaling={allowFontScaling}
          style={style}
        >
          {word}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap' },
});
