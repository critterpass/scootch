import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { fonts } from '@scootch/tokens';

import { Scootch, type ScootchProps } from '../../art/Scootch';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { useCharacterMotion, useMayMove } from '../../ui/motion/use-feel';
import { useKeyboardOpen } from '../../ui/use-keyboard-open';
import { useScreenStyle } from '../../ui/use-screen-style';

import { figureIn, GUTTER, lineOf, SENTENCE_LINE, type FigureFrame } from './one-screen-frame';

/** He is drawn once, at the largest size any board gives him, and scaled to each state's size. */
const DRAWN = 300;
const SIZE_LARGE_TEXT = 120;
/** With the keyboard up there is room for a sentence of two or three lines above the field. */
const SIZE_KEYBOARD = 140;
/** A change of size keeps time with the keyboard's own rise. */
const RESIZE_MS = 420;

export interface OneScreenFigureProps {
  readonly frame: FigureFrame;
  readonly mood: ScootchProps['mood'];
  readonly attitude: NonNullable<ScootchProps['attitude']>;
  /** Scootch's sentence, from the day store or the offline pack; `null` when he says nothing. */
  readonly line: string | null;
  /** Drawn in his place, in the same space: Scootch with the task's monster beside him. */
  readonly figure?: ReactNode;
  /** A tap on him, where he answers to it. */
  readonly onPress?: (() => void) | undefined;
}

/**
 * Scootch and his sentence as the board frames them: he stands at the bottom of his space, at the
 * size that state gives him, and the sentence sits under his feet in its own type. Between states
 * he changes size by a transform on the UI thread; his drawing is never rebuilt for it and no
 * layout is animated. A screen reader meets "Scootch" once, and his value is what he is saying.
 */
export function OneScreenFigure({
  frame,
  mood,
  attitude,
  line,
  figure,
  onPress,
}: OneScreenFigureProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const character = useCharacterMotion();
  const mayMove = useMayMove();
  const keyboardOpen = useKeyboardOpen();
  const t = useT();
  const { language } = useLanguage();
  const { width, height } = useWindowDimensions();

  const full = figureIn(largeText ? SIZE_LARGE_TEXT : frame.figure, width, height);
  const shown = keyboardOpen ? Math.min(full, SIZE_KEYBOARD) : full;
  // The space above his head is the board's; it goes with him when he is made small.
  const box = shown + (shown === frame.figure ? frame.box - frame.figure : 0);

  const scale = useSharedValue(shown / DRAWN);
  useEffect(() => {
    const target = shown / DRAWN;
    scale.value = mayMove
      ? withTiming(target, {
          duration: RESIZE_MS,
          easing: SPRING_CURVE,
          reduceMotion: ReduceMotion.Never,
        })
      : target;
  }, [mayMove, scale, shown]);
  const sized = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const sentence = size(frame.sentence);
  const words =
    line === null ? null : (
      <Text
        allowFontScaling={allowFontScaling}
        style={[
          styles.line,
          {
            color: palette.ink,
            fontSize: sentence,
            lineHeight: sentence * lineOf(SENTENCE_LINE, language),
            letterSpacing: -0.02 * frame.sentence,
            marginTop: frame.textTop,
          },
        ]}
      >
        {line}
      </Text>
    );

  if (figure !== undefined) {
    // Scootch with a monster beside him is drawn by the state itself, at the board's sizes. With
    // the keyboard up the pair is scaled down into a small space, so a field under them is not
    // pushed beneath the keys.
    const pairBox = largeText ? undefined : frame.box;
    const small = keyboardOpen && pairBox !== undefined;
    return (
      <View style={{ marginTop: frame.top }}>
        <View style={[styles.box, small ? { height: SIZE_KEYBOARD } : { minHeight: pairBox }]}>
          <View
            style={
              small && {
                transform: [{ scale: SIZE_KEYBOARD / pairBox }],
                transformOrigin: 'bottom',
              }
            }
          >
            {figure}
          </View>
        </View>
        {line === null ? null : (
          <View testID="one-sentence" style={styles.words}>
            {words}
          </View>
        )}
      </View>
    );
  }

  // A tap on Scootch himself is his to answer; a screen reader reaches the same thing by
  // activating the element.
  return (
    <View
      accessible
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={t('brand.name')}
      accessibilityValue={{ text: line ?? '' }}
      {...(onPress
        ? { accessibilityHint: t('scootch.squeakHint'), onAccessibilityTap: onPress }
        : {})}
      testID="one-sentence"
      style={{ marginTop: frame.top }}
    >
      <View style={[styles.box, { height: box }]}>
        <Animated.View style={[styles.drawn, sized]}>
          <Scootch
            mood={mood}
            attitude={attitude}
            size={DRAWN}
            squashOnChange
            {...(onPress ? { onPress } : {})}
            {...character}
          />
        </Animated.View>
      </View>
      <View style={styles.words}>{words}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  drawn: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -DRAWN / 2,
    width: DRAWN,
    height: DRAWN,
    transformOrigin: 'bottom',
  },
  words: {
    paddingHorizontal: GUTTER.words,
  },
  line: {
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
});
