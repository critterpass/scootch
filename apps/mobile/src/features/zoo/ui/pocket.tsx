import { useIsFocused } from 'expo-router';
import { Canvas, Group, rect, rrect } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  buildMaterial,
  RARITY_LOOKS,
  rgba,
  roundRect,
  VIEW_SIZE,
  type DrawCommand,
} from '@scootch/art';
import type { CardRarity, MonsterRow } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { CommandLayer } from '../../../art/skia-commands';
import { useAppearance } from '../../../screens/registry/support/forced-variant';
import { useCharacterMotion } from '../../../ui/motion/use-feel';
import { STAMPED } from '../../plus/ui/member-card';
import { CommandCanvas } from '../../reveal/ui/command-canvas';
import { LiveMonsterLayer } from '../../reveal/ui/live-monster';

/** How a pocket is cut: its sleeve, the card inside it and the monster on the card. */
export interface PocketSize {
  /** On the shelf a pocket carries its number and a stat; on a page it only names its monster. */
  readonly on: 'shelf' | 'page';
  readonly height: number;
  readonly corner: number;
  /** How far the card sits inside the sleeve. */
  readonly sleeve: number;
  readonly card: number;
  readonly monster: number;
}
/** A pocket on the shelf: a 154 point sleeve with a 13 point corner round a card 5 points in. */
export const SHELF_POCKET: PocketSize = {
  on: 'shelf',
  height: 154,
  corner: 13,
  sleeve: 5,
  card: 9,
  monster: 86,
};
/** A pocket on a month's page: a little smaller, 4 points in. */
export const PAGE_POCKET: PocketSize = {
  on: 'page',
  height: 150,
  corner: 10,
  sleeve: 4,
  card: 7,
  monster: 78,
};
/** A page pocket no shorter than this still shows its monster and its name. */
const LEAST_PAGE_POCKET = 96;

/** The page's pocket at a height that lets three rows fit: the board's, or less on a short phone. */
export function pagePocketFor(height: number): PocketSize {
  const fitted = Math.round(Math.min(PAGE_POCKET.height, Math.max(LEAST_PAGE_POCKET, height)));
  return { ...PAGE_POCKET, height: fitted, monster: Math.min(PAGE_POCKET.monster, fitted - 46) };
}
/** A small monster in a grid is redrawn at this rate: enough for the boil and a bob. */
const POCKET_HZ = 8;
/** The gloss of the plastic: a bright band at the leading corner and a faint one further across. */
const GLOSS: readonly [number, string, number][] = [
  [0, '#FFFFFF', 0.55],
  [0.14, '#FFFFFF', 0.55],
  [0.26, '#FFFFFF', 0],
  [0.7, '#FFFFFF', 0],
  [0.8, '#FFFFFF', 0.25],
  [0.9, '#FFFFFF', 0],
  [1, '#FFFFFF', 0],
];

/** The two ends of a CSS linear gradient at `degrees` across a box. */
function ends(width: number, height: number, degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  return {
    from: [width / 2 - dx * half, height / 2 - dy * half] as const,
    to: [width / 2 + dx * half, height / 2 + dy * half] as const,
  };
}

/** The plastic's gloss over a whole pocket. */
function Gloss({ width, height, corner }: { width: number; height: number; corner: number }) {
  const commands = useMemo((): DrawCommand[] => {
    const line = ends(width, height, 118);
    return [
      {
        op: 'paint',
        path: roundRect({ x: 0, y: 0, w: width, h: height }, corner),
        paint: { kind: 'linear', from: line.from, to: line.to, stops: GLOSS },
        alpha: 1,
        blend: 'normal',
      },
    ];
  }, [width, height, corner]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <CommandCanvas commands={commands} space={{ width, height }} width={width} />
    </View>
  );
}

export interface CardFaceProps {
  readonly rarity: CardRarity;
  readonly spec: MonsterRow['spec'];
  readonly width: number;
  readonly height: number;
  readonly corner: number;
  /** How big the monster is drawn, standing on the card's foot. */
  readonly monster: number;
  /** How far the monster's feet are above the card's foot, to leave room for words under it. */
  readonly lift: number;
}

/**
 * A caught card at pocket size: the stock its rarity is printed on, and its monster asleep on it.
 * The words are the caller's, laid over it.
 */
const CardFace = memo(function CardFace(props: CardFaceProps) {
  const { rarity, spec, width, height, corner, monster, lift } = props;
  const character = useCharacterMotion();
  // Asked here, outside the canvas, and handed to the monster's layer inside it.
  const focused = useIsFocused();
  const alive = focused && !character.reducedMotion && character.care === 'none';
  const stock = useMemo(
    () => buildMaterial({ x: 0, y: 0, w: width, h: height }, corner, RARITY_LOOKS[rarity].material),
    [width, height, corner, rarity],
  );
  const clip = useMemo(
    () => rrect(rect(0, 0, width, height), corner, corner),
    [width, height, corner],
  );
  return (
    <Canvas style={{ width, height }}>
      <CommandLayer commands={stock} />
      <Group clip={clip}>
        <Group
          transform={[
            { translateX: (width - monster) / 2 },
            { translateY: height - monster - lift },
            { scale: monster / VIEW_SIZE },
          ]}
        >
          <LiveMonsterLayer spec={spec} alive={alive} hz={POCKET_HZ} mood="caught" />
        </Group>
      </Group>
    </Canvas>
  );
});

export interface PocketProps {
  readonly rarity: CardRarity;
  readonly spec: MonsterRow['spec'];
  readonly name: string;
  readonly width: number;
  readonly size: PocketSize;
  /** "No. 041", in the top corner. Left out on a page, where the pocket only names its monster. */
  readonly number?: string;
  /** The rarity's own word, for a card that is not common. */
  readonly rarityWord?: string | null;
  /** The one number that matters for the order the shelf is in. */
  readonly stat?: string;
  /** The card last looked at wears a tomato ring, so the shelf shows where you were. */
  readonly chosen?: boolean;
}

/**
 * One card in its plastic pocket, as the binder sleeves it: the sleeve, the card in the stock of
 * its rarity with its monster asleep on it, its number and name, and the gloss of the plastic
 * over all of it.
 */
export const Pocket = memo(function Pocket(props: PocketProps) {
  const { rarity, spec, name, width, size, number, rarityWord, stat, chosen = false } = props;
  const look = RARITY_LOOKS[rarity];
  const inner = { w: width - size.sleeve * 2, h: size.height - size.sleeve * 2 };
  const sub = rgba(look.material.sub[0], look.material.sub[1]);
  const onShelf = size.on === 'shelf';
  // The plastic is nearly white on the light page and a faint sheen on the dark one.
  const dark = useAppearance() === 'dark';
  const plastic = dark ? 0.14 : onShelf ? 0.6 : 0.35;
  return (
    <View
      style={[
        styles.sleeve,
        {
          width,
          height: size.height,
          borderRadius: size.corner,
          padding: size.sleeve,
          backgroundColor: `rgba(255,255,255,${plastic})`,
          boxShadow: chosen
            ? 'inset 0 0 0 1px rgba(28,26,23,0.08), 0 0 0 2.5px #F0562E'
            : onShelf
              ? 'inset 0 0 0 1px rgba(28,26,23,0.08), 0 6px 14px -8px rgba(28,26,23,0.3)'
              : 'inset 0 0 0 1px rgba(28,26,23,0.1)',
        },
      ]}
    >
      <View style={{ borderRadius: size.card, overflow: 'hidden' }}>
        <CardFace
          rarity={rarity}
          spec={spec}
          width={inner.w}
          height={inner.h}
          corner={size.card}
          monster={size.monster}
          lift={onShelf ? 30 : 20}
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.print]}>
          {number === undefined ? null : (
            <View style={styles.top}>
              <Text allowFontScaling={false} style={[styles.stamp, { color: sub }]}>
                {number}
              </Text>
              {rarityWord ? (
                <Text allowFontScaling={false} style={[styles.stamp, { color: look.word }]}>
                  {rarityWord.toLocaleUpperCase()}
                </Text>
              ) : null}
            </View>
          )}
          <View style={onShelf ? styles.foot : styles.footCentred}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[onShelf ? styles.name : styles.nameSmall, { color: look.material.text }]}
            >
              {name}
            </Text>
            {stat === undefined ? null : (
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={[styles.stat, { color: sub }]}
              >
                {stat.toLocaleUpperCase()}
              </Text>
            )}
          </View>
        </View>
      </View>
      <Gloss width={width} height={size.height} corner={size.corner} />
    </View>
  );
});

/** An empty pocket on a page: the sleeve with nothing in it yet. */
export function EmptyPocket({
  width,
  size,
}: {
  readonly width: number;
  readonly size: PocketSize;
}) {
  return (
    <View
      style={[
        styles.sleeve,
        styles.empty,
        { width, height: size.height, borderRadius: size.corner },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  sleeve: { overflow: 'visible' },
  empty: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    boxShadow: 'inset 0 0 0 1px rgba(28,26,23,0.1)',
  },
  print: { paddingHorizontal: 6, paddingTop: 6, paddingBottom: 7, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  stamp: { fontFamily: STAMPED, fontWeight: '700', fontSize: 7, letterSpacing: 0.7 },
  foot: { marginTop: 'auto' },
  footCentred: { marginTop: 'auto', alignItems: 'center' },
  name: { fontFamily: fonts.heading, fontWeight: '800', fontSize: 12, lineHeight: 13 },
  nameSmall: { fontFamily: fonts.heading, fontWeight: '800', fontSize: 10.5, lineHeight: 11.5 },
  stat: {
    marginTop: 3,
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 8,
    letterSpacing: 0.48,
  },
});
