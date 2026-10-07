import { StyleSheet, Text } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useScreenStyle } from '../../ui/use-screen-style';

const HEARD_SIZE = 22;
const HEARD_LINE = 1.36;
/** The newest words of a live transcript stand in ink; what was said before them fades. */
const NEWEST_WORDS = 8;

/** What has been heard so far, while it is being said: the newest words in ink, the rest faded. */
export function HeardWords({ transcript }: { readonly transcript: string }) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const words = transcript.trim().split(/\s+/u);
  const older = words.slice(0, Math.max(0, words.length - NEWEST_WORDS)).join(' ');
  const newest = words.slice(-NEWEST_WORDS).join(' ');
  return (
    <Text
      testID="composer-heard"
      accessibilityLiveRegion="polite"
      allowFontScaling={allowFontScaling}
      style={[
        styles.transcript,
        {
          color: palette.faint,
          fontSize: size(HEARD_SIZE),
          lineHeight: size(HEARD_SIZE) * HEARD_LINE,
        },
      ]}
    >
      {older === '' ? null : `${older} `}
      <Text style={{ color: palette.ink }}>{newest}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  transcript: {
    fontFamily: fonts.heading,
    fontWeight: '500',
    letterSpacing: -0.22,
  },
});
