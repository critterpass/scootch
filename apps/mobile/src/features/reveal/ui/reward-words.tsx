import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type TextProps } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useTextSizing } from '../../../screens/registry/support/forced-variant';
import { PopIn } from '../../../ui/motion/pop-in';
import { useScreenStyle } from '../../../ui/use-screen-style';

/** The reward steps' eyebrow: 13 points, semibold, capitals, a fiftieth of an em apart. */
export function RewardEyebrow({
  tone,
  pop = false,
  children,
  ...rest
}: TextProps & { readonly tone: 'tomato' | 'muted'; readonly pop?: boolean }) {
  const { palette } = useScreenStyle();
  const { allowFontScaling, size } = useTextSizing();
  const text = (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={2}
      accessibilityRole="header"
      {...rest}
      style={[
        styles.eyebrow,
        {
          color: tone === 'tomato' ? palette.tomato : palette.muted,
          fontSize: size(13),
          lineHeight: size(13) * 1.2,
        },
      ]}
    >
      {children}
    </Text>
  );
  // The board pops it from its leading edge.
  return pop ? <PopIn style={styles.fromLeading}>{text}</PopIn> : text;
}

/** The reward steps' big line, at the size its frame sets (30, 27 or 34 points). */
export function RewardHeadline({
  size: designSize,
  tight = false,
  children,
  ...rest
}: TextProps & { readonly size: 27 | 30 | 34; readonly tight?: boolean }) {
  const { palette } = useScreenStyle();
  const { allowFontScaling, size } = useTextSizing();
  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={1.5}
      {...rest}
      style={[
        styles.headline,
        {
          color: palette.ink,
          fontSize: size(designSize),
          lineHeight: size(designSize) * (tight ? 1.07 : 1.14),
          letterSpacing: -0.02 * designSize,
        },
      ]}
    >
      {children}
    </Text>
  );
}

/** The quiet sentence under a headline: 17 points on a 1.42 line, in the muted ink. */
export function RewardNote({ children, ...rest }: TextProps) {
  const { palette } = useScreenStyle();
  const { allowFontScaling, size } = useTextSizing();
  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={2}
      {...rest}
      style={[
        styles.note,
        { color: palette.muted, fontSize: size(17), lineHeight: size(17) * 1.42 },
      ]}
    >
      {children}
    </Text>
  );
}

/** The words of a reward step: 28 points in from the sides, 12 apart. */
export function RewardWords({ children }: { readonly children: ReactNode }) {
  return <View style={styles.words}>{children}</View>;
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.body,
    fontWeight: '600',
    letterSpacing: 0.26,
    textTransform: 'uppercase',
  },
  fromLeading: { alignSelf: 'flex-start', transformOrigin: 'left center' },
  headline: { fontFamily: fonts.heading, fontWeight: '700' },
  note: { fontFamily: fonts.body, fontWeight: '400' },
  // The frame's own margin is 24; the board sets these words 28 in.
  words: { paddingHorizontal: 4, gap: 12 },
});
