import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { buildMaterial, CARD_MATERIALS, rgba } from '@scootch/art';
import type { CardFinish } from '@scootch/domain';

import { Scootch } from '../../art/Scootch';
import { memberNumber, STAMPED } from '../plus/ui/member-card';
import { CommandCanvas } from '../reveal/ui/command-canvas';

/** The member card at the size of a row's picture: 32 by 22 with a 5 point corner. */
const CARD = { width: 32, height: 22, radius: 5 } as const;
/** A caught card at the size of a row's picture: 23 by 32, leaning a little. */
const TALL = { width: 23, height: 32, radius: 5 } as const;
const SEAT = 44;

function Material({
  finish,
  shape,
}: {
  readonly finish: CardFinish;
  readonly shape: { readonly width: number; readonly height: number; readonly radius: number };
}) {
  const commands = useMemo(
    () =>
      buildMaterial(
        { x: 0, y: 0, w: shape.width, h: shape.height },
        shape.radius,
        CARD_MATERIALS[finish],
      ),
    [finish, shape],
  );
  return <CommandCanvas commands={commands} space={shape} width={shape.width} />;
}

/** The member card, tiny, in the finish that is worn, with its number where there is one. */
export function CardThumb({
  finish,
  number,
}: {
  readonly finish: CardFinish;
  readonly number: number | null;
}) {
  const sub = CARD_MATERIALS[finish].sub;
  return (
    <View style={[styles.thumb, CARD, { borderRadius: CARD.radius }]}>
      <Material finish={finish} shape={CARD} />
      {number === null ? null : (
        <Text allowFontScaling={false} style={[styles.number, { color: rgba(sub[0], sub[1]) }]}>
          {memberNumber(number)}
        </Text>
      )}
    </View>
  );
}

/** One caught card, tiny and leaning, in the finish that is worn. */
export function FinishThumb({ finish }: { readonly finish: CardFinish }) {
  return (
    <View style={styles.leaning}>
      <View style={[styles.thumb, TALL, { borderRadius: TALL.radius }]}>
        <Material finish={finish} shape={TALL} />
      </View>
    </View>
  );
}

/** Who sits at a table: Scootch in a round seat. */
export function SeatThumb({ ground }: { readonly ground: string }) {
  return (
    <View style={[styles.seat, { backgroundColor: ground }]}>
      <Scootch mood="waiting" size={SEAT} reducedMotion />
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28,26,23,0.14)',
  },
  number: {
    position: 'absolute',
    left: 4,
    bottom: 3,
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 6,
    letterSpacing: 0.36,
  },
  // As wide as the member card's picture, so the words of every row start on one line.
  leaning: {
    width: CARD.width,
    alignItems: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  seat: {
    width: SEAT,
    height: SEAT,
    borderRadius: SEAT / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
