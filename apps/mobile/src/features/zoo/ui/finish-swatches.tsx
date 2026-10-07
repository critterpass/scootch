import {
  Canvas,
  Group,
  LinearGradient,
  Path,
  Rect,
  rect,
  rrect,
  Skia,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CardFinish } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { useTextSizing } from '../../../screens/registry/support/forced-variant';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { FINISH_ORDER, finishOpen } from '../../plus/finish-picker';
import { gradientEnds } from '../../reveal/ui/foil-geometry';

/** The board's swatch: 46 points square with a 14 point corner, 12 apart, its name 5 under it. */
const SIZE = 46;
const CORNER = 14;
const BOX = { x: 0, y: 0, w: SIZE, h: SIZE };
const INK = '#1C1A17';

/** What each finish's swatch is filled with, as the Plus board paints them. */
const FILLS: Record<
  CardFinish,
  | { readonly flat: string }
  | { readonly blend: readonly string[]; readonly at?: readonly number[] }
  | { readonly stripes: readonly [string, string] }
> = {
  standard: { blend: ['#F6E7C9', '#FBD3B8', '#CFE7DE'], at: [0, 0.45, 1] },
  kraft: { flat: '#E9D9B8' },
  gold: { blend: ['#F2C46B', '#FFE9A8', '#C1922F'] },
  night: { flat: '#24304A' },
  riso: { stripes: ['#F0562E', '#FBF8F2'] },
};

/** Four-point stripes at 45 degrees across the swatch, as one path. */
function stripePath() {
  const path = Skia.Path.Make();
  // A stripe 4 wide every 8, measured across the stripes; along x that is every 8·√2.
  const step = 8 * Math.SQRT2;
  const wide = 4 * Math.SQRT2;
  for (let x = -SIZE; x < SIZE * 2; x += step) {
    path.moveTo(x, SIZE);
    path.lineTo(x + wide, SIZE);
    path.lineTo(x + wide + SIZE, 0);
    path.lineTo(x + SIZE, 0);
    path.close();
  }
  return path;
}

function Swatch({ finish }: { readonly finish: CardFinish }) {
  const fill = FILLS[finish];
  const clip = useMemo(() => rrect(rect(0, 0, SIZE, SIZE), CORNER, CORNER), []);
  const stripes = useMemo(() => ('stripes' in fill ? stripePath() : null), [fill]);
  const ends = gradientEnds(BOX, 135);
  return (
    <Canvas style={styles.swatch}>
      <Group clip={clip}>
        {'flat' in fill ? <Rect x={0} y={0} width={SIZE} height={SIZE} color={fill.flat} /> : null}
        {'blend' in fill ? (
          <Rect x={0} y={0} width={SIZE} height={SIZE}>
            <LinearGradient
              start={ends.start}
              end={ends.end}
              colors={[...fill.blend]}
              {...(fill.at ? { positions: [...fill.at] } : {})}
            />
          </Rect>
        ) : null}
        {'stripes' in fill && stripes ? (
          <>
            <Rect x={0} y={0} width={SIZE} height={SIZE} color={fill.stripes[1]} />
            <Path path={stripes} color={fill.stripes[0]} />
          </>
        ) : null}
      </Group>
    </Canvas>
  );
}

/** The board's small padlock in its white disc. */
function LockBadge() {
  return (
    <View style={styles.badge}>
      <View style={styles.lock}>
        <View style={styles.shackle} />
        <View style={styles.lockBody} />
      </View>
    </View>
  );
}

export interface FinishSwatchesProps {
  readonly worn: CardFinish;
  readonly plus: boolean;
  readonly onChoose: (finish: CardFinish) => void;
  /** A locked finish was tapped: the sheet opens, and only then. */
  readonly onLocked: () => void;
}

/**
 * The five finishes under an open card, as the Plus board draws them: each swatch painted in its
 * own paper, the worn one ringed in tomato, the ones that come with Plus under a small padlock.
 */
export function FinishSwatches({ worn, plus, onChoose, onLocked }: FinishSwatchesProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  const { allowFontScaling, size } = useTextSizing();
  return (
    <View accessibilityRole="radiogroup" style={styles.row} testID="finish-picker">
      {FINISH_ORDER.map((finish) => {
        const open = finishOpen(finish, plus, worn);
        const chosen = finish === worn;
        return (
          <PressSpring
            key={finish}
            accessibilityRole="radio"
            accessibilityState={{ selected: chosen, checked: chosen }}
            accessibilityLabel={t(`finish.${finish}`)}
            accessibilityHint={open ? t('finish.hint') : t('keep.plusOnly.hint')}
            onPress={() => (open ? onChoose(finish) : onLocked())}
            feedback="choice"
            hitSlop={6}
            testID={`finish-${finish}`}
            style={styles.item}
          >
            <View
              style={[
                styles.frame,
                chosen
                  ? {
                      boxShadow: `0 0 0 2.5px ${palette.surface}, 0 0 0 4.5px ${palette.tomato}`,
                    }
                  : null,
              ]}
            >
              <Swatch finish={finish} />
              {chosen ? null : <View pointerEvents="none" style={styles.edge} />}
              {open ? null : <LockBadge />}
            </View>
            <Text
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={1.5}
              numberOfLines={1}
              style={[styles.name, { color: palette.muted, fontSize: Math.min(size(11), 16.5) }]}
            >
              {t(`finish.${finish}`)}
            </Text>
          </PressSpring>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  item: { alignItems: 'center', gap: 5, minWidth: SIZE },
  frame: {
    width: SIZE,
    height: SIZE,
    borderRadius: CORNER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: CORNER,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28,26,23,0.12)',
  },
  swatch: { position: 'absolute', width: SIZE, height: SIZE },
  name: { fontFamily: fonts.body, fontWeight: '500' },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: { width: 8.4, height: 10.5 },
  shackle: {
    position: 'absolute',
    left: 1.4,
    top: 0,
    width: 5.6,
    height: 6.3,
    borderWidth: 1.4,
    borderBottomWidth: 0,
    borderColor: INK,
    borderTopLeftRadius: 3.5,
    borderTopRightRadius: 3.5,
  },
  lockBody: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 8.4,
    height: 5.6,
    borderRadius: 1.75,
    backgroundColor: INK,
  },
});
