import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { fonts, fontSizes, spacing } from '@scootch/tokens';

import { Scootch, type ScootchProps } from '../art/Scootch';
import { useT } from '../i18n/i18n-provider';

import { useKeyboardOpen } from './use-keyboard-open';
import { useScreenStyle } from './use-screen-style';

/** The canvas Scootch stands in, as the design draws him; smaller at the large text sizes. */
const SCOOTCH_SIZE = 260;
const SCOOTCH_SIZE_LARGE_TEXT = 120;
/** With the keyboard up there is room for a sentence of two or three lines above the field. */
const SCOOTCH_SIZE_KEYBOARD = 140;
const SUB_SIZE = 17;

export interface ScootchSaysProps {
  readonly mood: ScootchProps['mood'];
  readonly attitude: NonNullable<ScootchProps['attitude']>;
  /**
   * What Scootch is saying, from the day store's line or the offline pack. Never a literal: the
   * words are not this screen's to write. `null` when he says nothing.
   */
  readonly line: string | null;
  /** A second, quieter sentence of his, under the first. */
  readonly more?: string | null;
  /** Tapping him, where he answers to it. */
  readonly onPress?: () => void;
}

/**
 * Scootch and his sentence, as one element: a screen reader meets "Scootch" once, and his value
 * is what he is saying.
 */
export function ScootchSays({ mood, attitude, line, more = null, onPress }: ScootchSaysProps) {
  const { palette, allowFontScaling, size, largeText, captured } = useScreenStyle();
  const t = useT();
  const { width } = useWindowDimensions();
  const keyboardOpen = useKeyboardOpen();
  const figure = Math.min(
    largeText ? SCOOTCH_SIZE_LARGE_TEXT : keyboardOpen ? SCOOTCH_SIZE_KEYBOARD : SCOOTCH_SIZE,
    keyboardOpen ? SCOOTCH_SIZE_KEYBOARD : SCOOTCH_SIZE,
    width - spacing.lg * 2,
  );
  const said = [line, more].filter((part) => part !== null).join(' ');

  const body = (
    <>
      <View style={styles.figure}>
        <Scootch mood={mood} attitude={attitude} size={figure} {...(captured && STILL)} />
      </View>
      {line === null ? null : (
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.line, { color: palette.ink, fontSize: size(fontSizes.sentence) }]}
        >
          {line}
        </Text>
      )}
      {more === null ? null : (
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.more, { color: palette.muted, fontSize: size(SUB_SIZE) }]}
        >
          {more}
        </Text>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={t('brand.name')}
        accessibilityValue={{ text: said }}
        accessibilityHint={t('scootch.squeakHint')}
        onPress={onPress}
        testID="one-sentence"
        style={styles.group}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={t('brand.name')}
      accessibilityValue={{ text: said }}
      testID="one-sentence"
      style={styles.group}
    >
      {body}
    </View>
  );
}

const STILL = { reducedMotion: true } as const;

const styles = StyleSheet.create({
  group: {
    gap: spacing.md,
  },
  figure: {
    alignItems: 'center',
  },
  line: {
    fontFamily: fonts.heading,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  more: {
    fontFamily: fonts.body,
  },
});
