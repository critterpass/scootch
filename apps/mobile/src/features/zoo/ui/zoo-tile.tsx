import { useIsFocused } from 'expo-router';
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
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { CARD_FINISHES, TILE_SHIMMER, VIEW_SIZE } from '@scootch/art';
import { fonts } from '@scootch/tokens';

import { useTextSizing } from '../../../screens/registry/support/forced-variant';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useCharacterMotion } from '../../../ui/motion/use-feel';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { gradientEnds, inkAt, slidBox } from '../../reveal/ui/foil-geometry';
import { LiveMonsterLayer } from '../../reveal/ui/live-monster';
import type { CaughtMonster } from '../zoo-cards';

/** The board's mini card: 146 tall with a 12 point corner, a 4 point ink edge and a 9 point panel. */
export const TILE = { height: 146, corner: 12, edge: 4, panelCorner: 9, monster: 110 } as const;
/** A small monster in a grid is redrawn at this rate: enough for the boil and a bob. */
const TILE_HZ = 8;

/** A screen of dots on a 9 point grid, starting half a step in, as the card's panel has. */
function dots(width: number, height: number) {
  const path = Skia.Path.Make();
  for (let y = 4.5; y < height; y += 9) {
    for (let x = 4.5; x < width; x += 9) path.addCircle(x, y, 1.4);
  }
  return path;
}

export interface ZooTileProps {
  readonly monster: CaughtMonster;
  readonly index: number;
  readonly width: number;
  /** "Rare", in the reader's language, for the tag. */
  readonly rareLabel: string;
  /** "No. 041 · 9 min". */
  readonly meta: string;
  readonly label: string;
  readonly hint: string;
  /** Seconds, shared by every tile, for the rare ones' shimmer. */
  readonly clock: SharedValue<number>;
  readonly onPress: (monster: CaughtMonster) => void;
}

/**
 * One caught monster as the board's mini card: an ink edge in its finish, the dotted panel, the
 * monster alive at its foot, and for a rare one a holo shimmer sweeping across and the RARE tag.
 */
export const ZooTile = memo(function ZooTile(props: ZooTileProps) {
  const { monster, index, width, clock } = props;
  const { palette } = useScreenStyle();
  const { allowFontScaling, size } = useTextSizing();
  const character = useCharacterMotion();
  const inks = CARD_FINISHES[monster.finish];
  const rare = monster.rarity === 'rare';
  const panel = useMemo(
    () => ({ x: 0, y: 0, w: width - TILE.edge * 2, h: TILE.height - TILE.edge * 2 }),
    [width],
  );
  const clip = useMemo(
    () => rrect(rect(0, 0, panel.w, panel.h), TILE.panelCorner, TILE.panelCorner),
    [panel.w, panel.h],
  );
  const screen = useMemo(() => dots(panel.w, panel.h), [panel.w, panel.h]);
  // Asked here, outside the canvas, and handed to the monster's layer inside it.
  const focused = useIsFocused();
  const alive = focused && !character.reducedMotion && character.care === 'none';
  const shimmer = useMemo(() => {
    const [first, middle, last] = TILE_SHIMMER.colors;
    const [a, b, c] = TILE_SHIMMER.alphas;
    return [
      inkAt(first, 0),
      inkAt(first, 0),
      inkAt(first, a),
      inkAt(middle, b),
      inkAt(last, c),
      inkAt(last, 0),
      inkAt(last, 0),
    ];
  }, []);
  // Each rare tile sweeps a little out of step with the next, as the board's do.
  const band = useDerivedValue(() => {
    const px = 50 + Math.sin(clock.value * TILE_SHIMMER.speed + index) * TILE_SHIMMER.sweep;
    return gradientEnds(slidBox(panel, TILE_SHIMMER.size, px, 50), TILE_SHIMMER.angle);
  });
  const start = useDerivedValue(() => band.value.start);
  const end = useDerivedValue(() => band.value.end);
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityHint={props.hint}
      testID={`zoo-tile-${index}`}
      onPress={() => props.onPress(monster)}
      style={[styles.tile, { width }]}
    >
      <View style={[styles.card, { backgroundColor: inks.frame }]}>
        <Canvas style={{ width: panel.w, height: panel.h }}>
          <Group clip={clip}>
            <Rect x={0} y={0} width={panel.w} height={panel.h} color={inks.panel} />
            <Path path={screen} color={inkAt(inks.panelDot, 0.22)} />
            <Group
              transform={[
                { translateX: (panel.w - TILE.monster) / 2 },
                { translateY: panel.h - TILE.monster },
                { scale: TILE.monster / VIEW_SIZE },
              ]}
            >
              <LiveMonsterLayer spec={monster.spec} alive={alive} hz={TILE_HZ} />
            </Group>
            {rare ? (
              <Rect
                x={0}
                y={0}
                width={panel.w}
                height={panel.h}
                blendMode="colorDodge"
                opacity={TILE_SHIMMER.opacity}
              >
                <LinearGradient
                  start={start}
                  end={end}
                  colors={shimmer}
                  positions={[...TILE_SHIMMER.stops]}
                />
              </Rect>
            ) : null}
          </Group>
        </Canvas>
        {rare ? (
          <View style={[styles.rare, { backgroundColor: inks.accent }]}>
            <Text allowFontScaling={false} style={[styles.rareWord, { color: inks.onAccent }]}>
              {props.rareLabel.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={1.5}
        numberOfLines={2}
        style={[
          styles.name,
          { color: palette.ink, fontSize: size(13), lineHeight: size(13) * 1.15 },
        ]}
      >
        {monster.name}
      </Text>
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={1.5}
        numberOfLines={1}
        style={[
          styles.meta,
          { color: palette.muted, fontSize: size(11), lineHeight: size(11) * 1.2 },
        ]}
      >
        {props.meta}
      </Text>
    </PressSpring>
  );
});

const styles = StyleSheet.create({
  tile: { gap: 6 },
  card: {
    height: TILE.height,
    borderRadius: TILE.corner,
    padding: TILE.edge,
    overflow: 'hidden',
  },
  rare: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  rareWord: {
    fontFamily: fonts.body,
    fontWeight: '700',
    fontSize: 9,
    lineHeight: 9,
    letterSpacing: 0.54,
  },
  name: { fontFamily: fonts.heading, fontWeight: '700' },
  meta: { fontFamily: fonts.body, fontWeight: '400', marginTop: -3 },
});
