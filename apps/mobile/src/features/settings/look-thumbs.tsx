import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { buildMaterial, CARD_MATERIALS, rgba } from '@scootch/art';
import type { CardFinish } from '@scootch/domain';

import { Scootch } from '../../art/Scootch';
import { memberNumber, STAMPED } from '../plus/ui/member-card';
import { CommandCanvas } from '../reveal/ui/command-canvas';

/**
 * Every picture at the head of a row stands in a slot this wide, so the words of every row in a
 * group start on one line whatever the picture's own shape.
 */
export const THUMB_SLOT = 32;
/** The member card at the size of a row's picture: 32 by 22 with a 5 point corner. */
const CARD = { width: THUMB_SLOT, height: 22, radius: 5 } as const;
/** A caught card at the size of a row's picture: 23 by 32, leaning a little. */
const TALL = { width: 23, height: 32, radius: 5 } as const;
/** A Lock Screen at the size of a row's picture. */
const PHONE = { width: 20, height: 32, radius: 6 } as const;
const SEAT = 44;
const TOMATO = '#F0562E';

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

/**
 * The member card, tiny, with its chip and its number where there is one. It is printed on the
 * finish it is given: the one that is worn for a member, and the foil Plus comes in for someone
 * who is not one yet, so the row shows what it leads to.
 */
export function CardThumb({
  finish,
  number,
}: {
  readonly finish: CardFinish;
  readonly number: number | null;
}) {
  const { sub, text } = CARD_MATERIALS[finish];
  return (
    <View style={[styles.thumb, styles.lifted, CARD, { borderRadius: CARD.radius }]}>
      <View style={[styles.clip, { borderRadius: CARD.radius }]}>
        <Material finish={finish} shape={CARD} />
      </View>
      <View style={styles.chip} />
      {number === null ? (
        // No number yet: the two short lines a card's print reads as at this size.
        <View style={styles.print}>
          <View style={[styles.rule, { width: 11, backgroundColor: text, opacity: 0.55 }]} />
          <View style={[styles.rule, { width: 7, backgroundColor: text, opacity: 0.3 }]} />
        </View>
      ) : (
        <Text allowFontScaling={false} style={[styles.number, { color: rgba(sub[0], sub[1]) }]}>
          {memberNumber(number)}
        </Text>
      )}
    </View>
  );
}

/**
 * One caught card, tiny and leaning, in the finish that is worn: its panel, somebody on it and
 * its line of print, so that even plain paper reads as a card and not as an empty box.
 */
export function FinishThumb({ finish }: { readonly finish: CardFinish }) {
  const { text } = CARD_MATERIALS[finish];
  return (
    <View style={styles.slot}>
      <View style={[styles.thumb, styles.lifted, styles.leaning, TALL, { borderRadius: 5 }]}>
        <View style={[styles.clip, { borderRadius: TALL.radius }]}>
          <Material finish={finish} shape={TALL} />
        </View>
        <View style={styles.panel}>
          <View style={styles.somebody} />
        </View>
        <View style={[styles.rule, styles.caption, { backgroundColor: text, opacity: 0.4 }]} />
      </View>
    </View>
  );
}

/** The three wallpapers at this size: the ground of each, and what stands at its foot. */
const WALLPAPER_LOOKS = {
  world: { ground: '#EBE3D3', clock: '#3A342D', foot: '#A9BF8F' },
  perched: { ground: '#F4E6DA', clock: '#3A342D', foot: TOMATO },
  night: { ground: '#23201D', clock: '#F4F0E8', foot: '#4A443D' },
} as const;

/** A Lock Screen, tiny: the clock at its top, and the world, Scootch or the shelf at its foot. */
export function WallpaperThumb({ kind }: { readonly kind: keyof typeof WALLPAPER_LOOKS }) {
  const look = WALLPAPER_LOOKS[kind];
  return (
    <View style={styles.slot}>
      <View style={[styles.thumb, styles.phone, { backgroundColor: look.ground, borderRadius: 6 }]}>
        <View style={[styles.clock, { backgroundColor: look.clock }]} />
        <View
          style={[
            kind === 'perched' ? styles.perched : styles.hill,
            { backgroundColor: look.foot },
          ]}
        />
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28,26,23,0.16)',
  },
  // A hairline alone leaves pale paper lost on a pale row: the card also stands a little off it.
  lifted: { boxShadow: '0 1px 2.5px rgba(28,26,23,0.16)' },
  clip: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  slot: { width: THUMB_SLOT, alignItems: 'center' },
  chip: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 4.5,
    borderRadius: 1.2,
    backgroundColor: '#C9C4BB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  print: { position: 'absolute', left: 4, bottom: 4, gap: 1.6 },
  rule: { height: 1.4, borderRadius: 0.7 },
  number: {
    position: 'absolute',
    left: 4,
    bottom: 3,
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 6,
    letterSpacing: 0.36,
  },
  leaning: { transform: [{ rotate: '-6deg' }] },
  panel: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 3,
    height: 17,
    borderRadius: 2.5,
    backgroundColor: 'rgba(240,86,46,0.14)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  somebody: {
    width: 10,
    height: 9,
    marginBottom: 2,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 3.5,
    borderBottomRightRadius: 3.5,
    backgroundColor: TOMATO,
  },
  caption: { position: 'absolute', left: 4, bottom: 5, width: 10 },
  phone: { ...PHONE, overflow: 'hidden', alignItems: 'center' },
  clock: { marginTop: 5, width: 9, height: 2.6, borderRadius: 1.3 },
  hill: {
    position: 'absolute',
    bottom: -7,
    width: 30,
    height: 16,
    borderRadius: 8,
  },
  perched: { position: 'absolute', bottom: 3, width: 9, height: 8, borderRadius: 4.5 },
  seat: {
    width: SEAT,
    height: SEAT,
    borderRadius: SEAT / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
