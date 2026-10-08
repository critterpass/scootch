import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { dotScreen, type DrawCommand } from '@scootch/art';
import { fonts } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { STAMPED } from '../../plus/ui/member-card';
import { CommandCanvas } from '../../reveal/ui/command-canvas';
import type { CaughtMonster } from '../zoo-cards';

/** The back of a card is plain paper with a fine dot, whatever the front is made of. */
const NOTES = { paper: '#F4EDE1', ink: '#1C1A17', sub: '#6F6A62', body: '#4E443B' } as const;
const STAMP = '#F0562E';
/** The board's card, which the back is laid out on: 272 by 400 with a 22 point corner. */
const SPACE = { width: 272, height: 400 } as const;
const RADIUS = 22;

export interface FieldNotesProps {
  readonly monster: CaughtMonster;
  /** "No. 041", as the front writes it. */
  readonly number: string;
  /** What is known about the catch, label and value, one to a ruled line. */
  readonly rows: readonly (readonly [label: string, value: string])[];
}

/**
 * The back of a card in the binder: the field notes. Its name again, what is known about the
 * catch on ruled lines, the one dry line written about it, and a round stamp in the corner that
 * says who caught it.
 */
export function FieldNotes({ monster, number, rows }: FieldNotesProps) {
  const t = useT();
  const dots = useMemo(
    (): DrawCommand[] => [
      {
        op: 'fill',
        path: dotScreen({ x: 0, y: 0, w: SPACE.width, h: SPACE.height }, 8, 1),
        color: NOTES.ink,
        alpha: 0.08,
        rule: 'nonzero',
      },
    ],
    [],
  );
  return (
    <View style={styles.notes}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <CommandCanvas commands={dots} space={SPACE} width={SPACE.width} />
      </View>
      <View style={styles.spread}>
        <Text allowFontScaling={false} style={styles.stamp}>
          {t('binder.card.fieldNotes').toLocaleUpperCase()}
        </Text>
        <Text allowFontScaling={false} style={styles.stamp}>
          {number}
        </Text>
      </View>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={styles.name}
      >
        {monster.name}
      </Text>
      <View style={styles.rows}>
        {rows.map(([label, value]) => (
          <View key={label}>
            <View style={styles.row}>
              <Text allowFontScaling={false} style={styles.rowLabel}>
                {label.toLocaleUpperCase()}
              </Text>
              <Text allowFontScaling={false} style={styles.rowValue}>
                {value}
              </Text>
            </View>
            <View style={styles.dashed} />
          </View>
        ))}
      </View>
      <Text allowFontScaling={false} numberOfLines={5} style={styles.flavour}>
        {monster.flavourText}
      </Text>
      <View style={styles.seal}>
        <Text allowFontScaling={false} style={styles.sealWord}>
          {t('binder.card.caught').toLocaleUpperCase()}
        </Text>
        <Text allowFontScaling={false} style={styles.sealSmall}>
          {t('binder.card.byYou').toLocaleUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notes: {
    flex: 1,
    borderRadius: RADIUS,
    overflow: 'hidden',
    padding: 18,
    backgroundColor: NOTES.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28,26,23,0.12)',
  },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
  stamp: {
    color: NOTES.sub,
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 8.5,
    letterSpacing: 1.2,
  },
  name: {
    marginTop: 14,
    color: NOTES.ink,
    fontFamily: fonts.heading,
    fontWeight: '900',
    fontSize: 26,
    letterSpacing: -0.78,
  },
  rows: { marginTop: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  rowLabel: {
    color: NOTES.sub,
    fontFamily: STAMPED,
    fontWeight: '500',
    fontSize: 11,
    letterSpacing: 1.1,
  },
  rowValue: { color: NOTES.ink, fontFamily: STAMPED, fontWeight: '700', fontSize: 11 },
  // A dashed rule: a box with no height, so its top and bottom edges draw as one line.
  dashed: {
    height: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: 'rgba(28,26,23,0.3)',
  },
  flavour: {
    marginTop: 14,
    paddingRight: 4,
    color: NOTES.body,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18.85,
  },
  seal: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2.5,
    borderColor: STAMP,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    transform: [{ rotate: '-12deg' }],
  },
  sealWord: { color: STAMP, fontFamily: fonts.heading, fontWeight: '900', fontSize: 11 },
  sealSmall: {
    color: STAMP,
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 6.5,
    letterSpacing: 0.78,
  },
});
