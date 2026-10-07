import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useLanguage } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { lineOf } from '../one-screen/one-screen-frame';

const LABEL_SIZE = 13;
const SUB_SIZE = 17;
const SUB_LINE = 1.42;
const HEADING_LINE = 1.07;
/** The monster's name and title; a shrunk task's smaller words are set a little smaller. */
const HEADING_SIZE = { hatched: 34, shrunk: 32 } as const;

export interface HatchWordsProps {
  /** "Your task hatched", "Now pocket-sized". */
  readonly label: string;
  /** The monster's name and title, or the smaller task. */
  readonly heading: string | null;
  /** What is said under it: the monster's own words, or Scootch's about the shrink. */
  readonly said: string | null;
  readonly shrunk: boolean;
}

/** The words under a hatched or a shrunk monster, set as the board sets them. */
export function HatchWords({ label, heading, said, shrunk }: HatchWordsProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const { language } = useLanguage();
  const headingSize = HEADING_SIZE[shrunk ? 'shrunk' : 'hatched'];
  return (
    <View testID="hatch" style={styles.words}>
      <Text
        allowFontScaling={allowFontScaling}
        style={[
          styles.label,
          { color: palette.muted, fontSize: size(LABEL_SIZE), lineHeight: size(LABEL_SIZE) * 1.2 },
        ]}
      >
        {label.toLocaleUpperCase()}
      </Text>
      {heading === null ? null : (
        <Text
          accessibilityRole="header"
          allowFontScaling={allowFontScaling}
          testID="hatch-heading"
          style={[
            styles.heading,
            {
              color: palette.ink,
              fontSize: size(headingSize),
              // The board's line in English; room for stacked marks in Vietnamese.
              lineHeight: size(headingSize) * lineOf(HEADING_LINE, language),
              letterSpacing: -0.02 * headingSize,
            },
          ]}
        >
          {heading}
        </Text>
      )}
      {said === null ? null : (
        <Text
          allowFontScaling={allowFontScaling}
          style={[
            styles.sub,
            {
              color: palette.muted,
              fontSize: size(SUB_SIZE),
              lineHeight: size(SUB_SIZE) * SUB_LINE,
            },
          ]}
        >
          {said}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  words: { gap: 12 },
  label: { fontFamily: fonts.body, fontWeight: '600', letterSpacing: 0.26 },
  heading: { fontFamily: fonts.heading, fontWeight: '700' },
  sub: { fontFamily: fonts.body },
});
