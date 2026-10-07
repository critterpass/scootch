import type { ReactNode } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useLanguage } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

export interface WordsProps extends Pick<TextProps, 'testID' | 'accessibilityLiveRegion'> {
  /**
   * `headline` is the screen's one big sentence, as the boards set it; `title` is a heading;
   * `body` is ink; `quiet` is the muted small print.
   */
  readonly kind?: 'headline' | 'title' | 'body' | 'quiet';
  readonly centred?: boolean;
  readonly children: ReactNode;
}

const SIZES = { headline: 27, title: 24, body: 17, quiet: 15 } as const;
/** The headline's line, and the least a Vietnamese one gets: its marks stack. */
const HEADLINE_LINE = 1.14;
const HEADLINE_LINE_VI = 1.2;

/** Interface text in the screen's inks, scaled with the person's text size. */
export function Words({ kind = 'body', centred = false, children, ...rest }: WordsProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const { language } = useLanguage();
  const heading = kind === 'title' || kind === 'headline';
  return (
    <Text
      {...rest}
      {...(heading ? { accessibilityRole: 'header' as const } : {})}
      allowFontScaling={allowFontScaling}
      style={[
        heading ? styles.title : styles.body,
        {
          color: kind === 'quiet' ? palette.muted : palette.ink,
          fontSize: size(SIZES[kind]),
          textAlign: centred ? 'center' : 'left',
        },
        kind === 'headline' && {
          letterSpacing: -0.54,
          lineHeight: size(SIZES.headline) * (language === 'vi' ? HEADLINE_LINE_VI : HEADLINE_LINE),
        },
        kind === 'quiet' && { lineHeight: size(SIZES.quiet) * 1.4 },
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.heading, fontWeight: '700', letterSpacing: -0.4 },
  body: { fontFamily: fonts.body },
});
