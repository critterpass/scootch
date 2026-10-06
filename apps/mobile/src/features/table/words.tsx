import type { ReactNode } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useScreenStyle } from '../../ui/use-screen-style';

export interface WordsProps extends Pick<TextProps, 'testID' | 'accessibilityLiveRegion'> {
  /** `title` is a heading; `body` is ink; `quiet` is the muted small print. */
  readonly kind?: 'title' | 'body' | 'quiet';
  readonly centred?: boolean;
  readonly children: ReactNode;
}

const SIZES = { title: 24, body: 17, quiet: 14 } as const;

/** Interface text in the screen's inks, scaled with the person's text size. */
export function Words({ kind = 'body', centred = false, children, ...rest }: WordsProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <Text
      {...rest}
      {...(kind === 'title' ? { accessibilityRole: 'header' as const } : {})}
      allowFontScaling={allowFontScaling}
      style={[
        kind === 'title' ? styles.title : styles.body,
        {
          color: kind === 'quiet' ? palette.muted : palette.ink,
          fontSize: size(SIZES[kind]),
          textAlign: centred ? 'center' : 'left',
        },
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
