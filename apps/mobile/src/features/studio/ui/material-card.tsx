import { Canvas, Group, rect, rrect } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

import { buildMaterialParts, CARD_MATERIALS, MATERIAL_LIGHT, rgba } from '@scootch/art';
import type { CardFinish } from '@scootch/domain';

import { CommandLayer } from '../../../art/skia-commands';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { useCardMotion } from '../../reveal/ui/card-motion';
import { TiltSensor } from '../../reveal/ui/tilt-sensor';

/** The board sets every card in about a thousand points of perspective. */
const PERSPECTIVE = 1000;

export interface MaterialCardProps {
  readonly finish: CardFinish;
  readonly width: number;
  readonly height: number;
  /** The board's corner: 22 on a tall card, 24 on the member card. */
  readonly radius?: number;
  /** What is printed on it: words and Scootch, laid over the material and turning with it. */
  readonly children?: ReactNode;
  /** Read out as one image. Left out, the card is decoration and is skipped. */
  readonly label?: string;
  /** The drop under the card, where a screen lights it its own way. The finish's own when left out. */
  readonly shadow?: string;
  readonly testID?: string;
}

/**
 * A card made of a finish: the stock, the light that slides over it as the phone tilts, sparkle,
 * grain and glare, as the board builds them (`[data-tilt]`, `[data-holo]`, `[data-glare]`). The
 * light moves on the UI thread; where nothing may move the card lies level and still.
 */
export function MaterialCard(props: MaterialCardProps) {
  const { finish, width, height, radius = 22, children, label, shadow, testID } = props;
  const { reducedMotion } = useScreenStyle();
  const motion = useCardMotion({ mayMove: !reducedMotion, handled: false, width, height });
  const material = CARD_MATERIALS[finish];
  const parts = useMemo(
    () => buildMaterialParts({ x: 0, y: 0, w: width, h: height }, radius, material),
    [width, height, radius, material],
  );
  const clip = useMemo(
    () => rrect(rect(0, 0, width, height), radius, radius),
    [width, height, radius],
  );
  const { rx, ry } = motion;
  const tilt = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${rx.value}deg` },
      { rotateY: `${ry.value}deg` },
    ],
  }));
  const slide = (MATERIAL_LIGHT.sheenSize - 1) * MATERIAL_LIGHT.perDegree;
  const sheen = useDerivedValue(() => [
    { translateX: -slide * width * ry.value },
    { translateY: slide * height * rx.value },
  ]);
  const glare = useDerivedValue(() => [
    { translateX: MATERIAL_LIGHT.perDegree * width * ry.value },
    { translateY: -MATERIAL_LIGHT.perDegree * height * rx.value },
  ]);
  const size = { width, height };
  return (
    <Animated.View
      testID={testID}
      accessible={label !== undefined}
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        size,
        {
          borderRadius: radius,
          boxShadow: shadow ?? `0 24px 40px -18px ${rgba(material.shadow[0], material.shadow[1])}`,
        },
        tilt,
      ]}
    >
      {motion.sensing ? <TiltSensor into={motion.phone} /> : null}
      <Canvas style={size}>
        <Group clip={clip}>
          <CommandLayer commands={parts.base} />
          <Group transform={sheen}>
            <CommandLayer commands={parts.sheen} />
          </Group>
          <CommandLayer commands={parts.over} />
          <Group transform={glare}>
            <CommandLayer commands={parts.glare} />
          </Group>
        </Group>
        <CommandLayer commands={parts.edge} />
      </Canvas>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.print, { borderRadius: radius }]}
      >
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  print: { overflow: 'hidden' },
});
