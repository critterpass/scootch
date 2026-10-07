import { StyleSheet, Text, View } from 'react-native';

import type { MonsterSpec } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { Monster } from '../../art/Monster';
import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

/** The card's own inks: it is printed paper, the same on a light page and a dark one. */
const FRAME = '#2B2723';
const PAPER = '#FBF8F3';
const PANEL = '#F9E4D8';
const INK = '#1C1A17';
const MUTED = '#6F6A62';
const WIDTH = 188;

export interface HauntCardProps {
  readonly spec: MonsterSpec;
  /** The monster's name, when this phone knows it. */
  readonly name: string | null;
  /** The line under the picture: what it is doing, or what the sender says. */
  readonly line: string | null;
}

/**
 * A monster that is not caught yet, as the card the board draws for a haunt: its name, its
 * picture on the dotted panel, one line, and "Not caught yet". It is a picture: to a screen
 * reader it is one element that reads the name and the line.
 */
export function HauntCard({ spec, name, line }: HauntCardProps) {
  const t = useT();
  const { allowFontScaling, size, largeText } = useScreenStyle();
  if (largeText) return null;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={[name, line, t('haunt.card.wild')].filter(Boolean).join('. ')}
      testID="haunt-card"
      style={styles.frame}
    >
      <View style={styles.paper}>
        <View style={styles.top}>
          <Text
            allowFontScaling={allowFontScaling}
            numberOfLines={2}
            style={[styles.name, { fontSize: size(15), lineHeight: size(15) * 1.15 }]}
          >
            {name ?? ''}
          </Text>
          <Text allowFontScaling={allowFontScaling} style={[styles.tag, { fontSize: size(9) }]}>
            {t('haunt.card.tag').toLocaleUpperCase()}
          </Text>
        </View>
        <View style={styles.panel}>
          <Monster spec={spec} size={132} />
        </View>
        {line === null ? null : (
          <Text
            allowFontScaling={allowFontScaling}
            numberOfLines={3}
            style={[styles.line, { fontSize: size(11) }]}
          >
            {line}
          </Text>
        )}
        <View style={styles.foot}>
          <Text allowFontScaling={allowFontScaling} style={[styles.small, { fontSize: size(9) }]}>
            {t('haunt.card.wild')}
          </Text>
          <Text allowFontScaling={allowFontScaling} style={[styles.site, { fontSize: size(9) }]}>
            scootch.app
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    width: WIDTH,
    padding: 6,
    borderRadius: 20,
    backgroundColor: FRAME,
    boxShadow: '0 18px 40px -12px rgba(28, 26, 23, 0.35)',
  },
  paper: { borderRadius: 14, backgroundColor: PAPER, padding: 12, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  name: { flexShrink: 1, fontFamily: fonts.heading, fontWeight: '700', color: INK },
  tag: {
    fontFamily: fonts.body,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: MUTED,
    marginTop: 4,
  },
  panel: {
    height: 148,
    borderRadius: 10,
    backgroundColor: PANEL,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  line: { fontFamily: fonts.body, fontStyle: 'italic', color: MUTED, lineHeight: 15 },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: `${INK}33`,
  },
  small: { fontFamily: fonts.body, color: MUTED },
  site: { fontFamily: fonts.body, fontWeight: '700', color: INK },
});
