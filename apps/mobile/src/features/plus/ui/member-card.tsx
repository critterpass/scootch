import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { CARD_MATERIALS, rgba, type DrawCommand } from '@scootch/art';
import type { CardFinish } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { Scootch, type ScootchProps } from '../../../art/Scootch';
import { useT } from '../../../i18n/i18n-provider';
import { useCharacterMotion } from '../../../ui/motion/use-feel';
import { CommandCanvas } from '../../reveal/ui/command-canvas';
import { MaterialCard } from '../../studio/ui/material-card';

/** The face a number is stamped in. The board's is a monospace; this is the phone's own. */
export const STAMPED = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** The board's member card is 345 by 218 with a 24 point corner; everything on it scales from that. */
const DRAWN = { width: 345, height: 218, radius: 24 } as const;
const CHIP = { width: 40, height: 30 } as const;

/** The contact chip: brushed steel with its five fine lines. */
const chip: DrawCommand[] = [
  {
    op: 'paint',
    path: [['M', 0, 0], ['L', 40, 0], ['L', 40, 30], ['L', 0, 30], ['Z']],
    paint: {
      kind: 'linear',
      from: [6, 0],
      to: [34, 30],
      stops: [
        [0, '#FDFDFC', 1],
        [0.3, '#B9B5AE', 1],
        [0.5, '#F2EFEA', 1],
        [0.8, '#8A867F', 1],
        [1, '#F4F2EE', 1],
      ],
    },
    alpha: 1,
    blend: 'normal',
  },
  ...[8, 17, 26, 35].map((x): DrawCommand => ({
    op: 'fill',
    path: [['M', x, 0], ['L', x + 1, 0], ['L', x + 1, 30], ['L', x, 30], ['Z']],
    color: '#000000',
    alpha: 0.18,
    rule: 'nonzero',
  })),
];

/** How a member number is written: four figures, as on the card. */
export function memberNumber(number: number): string {
  return String(number).padStart(4, '0');
}

export interface MemberCardProps {
  readonly finish: CardFinish;
  /** The width on screen. The board's is 345 on "Your card" and 310 on the sheet. */
  readonly width: number;
  /** The member's number; `null` before the server has given one, or for someone not a member. */
  readonly number: number | null;
  /** The year the card was issued, as the card writes it. */
  readonly year: string;
  /** The small line under the number: a name, or the finish and ink the card wears. */
  readonly line: string | null;
  readonly mood: ScootchProps['mood'];
  readonly attitude?: ScootchProps['attitude'];
  /** False leaves Scootch off the card, as when he has climbed on top of it. */
  readonly scootch?: boolean;
  readonly testID?: string;
}

/**
 * The Scootch Plus member card: the name, the chip, the number and the year, and Scootch leaning
 * in at the corner, printed on whatever finish it is given. It reads out as one image.
 */
export function MemberCard(props: MemberCardProps) {
  const { finish, width, number, year, line, mood, attitude, scootch = true, testID } = props;
  const t = useT();
  const character = useCharacterMotion();
  const k = width / DRAWN.width;
  const material = CARD_MATERIALS[finish];
  const stamped = number === null ? year : `${memberNumber(number)} · ${year}`;
  const name = `${t('brand.name')} ${t('brand.plus')}`;
  const spoken = useMemo(
    () =>
      [name, number === null ? null : t('plus.card.member', { number }), line]
        .filter((part): part is string => part !== null)
        .join(', '),
    [t, name, number, line],
  );
  return (
    <MaterialCard
      finish={finish}
      width={width}
      height={DRAWN.height * k}
      radius={DRAWN.radius * k}
      label={spoken}
      {...(testID ? { testID } : {})}
    >
      {scootch ? (
        <View style={[styles.scootch, { bottom: -28 * k }]}>
          <Scootch mood={mood} size={150 * k} {...character} {...(attitude ? { attitude } : {})} />
        </View>
      ) : null}
      <View style={[styles.print, { paddingVertical: 20 * k, paddingHorizontal: 22 * k }]}>
        <View style={styles.top}>
          <Text
            allowFontScaling={false}
            style={[styles.name, { color: material.text, fontSize: 23 * k }]}
          >
            {name}
          </Text>
          <View style={[styles.chip, { borderRadius: 7 * k }]}>
            <CommandCanvas commands={chip} space={CHIP} width={CHIP.width * k} />
          </View>
        </View>
        <View style={{ gap: 6 * k }}>
          <Text
            allowFontScaling={false}
            style={[styles.number, { color: material.text, fontSize: 15 * k }]}
          >
            {stamped}
          </Text>
          {line === null ? null : (
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                styles.line,
                { color: rgba(material.sub[0], material.sub[1]), fontSize: 10 * k },
              ]}
            >
              {line.toLocaleUpperCase()}
            </Text>
          )}
        </View>
      </View>
    </MaterialCard>
  );
}

const styles = StyleSheet.create({
  print: { flex: 1, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontFamily: fonts.heading, fontWeight: '900', letterSpacing: -0.6 },
  chip: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  number: { fontFamily: STAMPED, fontWeight: '700', letterSpacing: 2.4 },
  line: { fontFamily: STAMPED, fontWeight: '500', letterSpacing: 1.4, maxWidth: '62%' },
  scootch: { position: 'absolute', right: 0 },
});
