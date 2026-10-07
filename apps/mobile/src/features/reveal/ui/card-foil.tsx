import {
  Group,
  LinearGradient,
  RadialGradient,
  Rect,
  rect,
  rrect,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { FOIL_LIGHT, type CardFinishInks, type FoilStrength } from '@scootch/art';

import { gradientEnds, inkAt, slidBox, type Box } from './foil-geometry';

export interface CardFoilProps {
  /** The paper the foil lies on, in the card's own space, and its corner radius. */
  readonly face: Box;
  readonly radius: number;
  readonly inks: CardFinishInks;
  readonly strength: FoilStrength;
  /** The card's lean, in degrees. */
  readonly rx: SharedValue<number>;
  readonly ry: SharedValue<number>;
  /** Seconds, for a rare card's own shimmer. */
  readonly clock: SharedValue<number>;
}

/**
 * The foil and the glare over a card's face, as the board lays them (`[data-holo]`,
 * `[data-glare]`): a five-colour band in colour dodge and a white glare in overlay, both sliding
 * 2.4% for every degree the card leans. It is two Skia nodes whose gradients are shared values:
 * a lean costs no React render and nothing on the JS thread.
 */
export function CardFoil({ face, radius, inks, strength, rx, ry, clock }: CardFoilProps) {
  const clip = useMemo(
    () => rrect(rect(face.x, face.y, face.w, face.h), radius, radius),
    [face, radius],
  );
  const colors = useMemo(() => {
    const first = inks.foil[0];
    const last = inks.foil[4];
    return [
      inkAt(first, 0),
      inkAt(first, 0),
      ...inks.foil.map((ink, i) => inkAt(ink, FOIL_LIGHT.alphas[i] ?? 0.5)),
      inkAt(last, 0),
      inkAt(last, 0),
    ];
  }, [inks]);
  const glare = useMemo(
    () => [inkAt(inks.glare, FOIL_LIGHT.glare.alpha), inkAt(inks.glare, 0)],
    [inks],
  );
  const shimmer = strength.shimmer;
  const band = useDerivedValue(() => {
    // A rare card's band never rests: it drifts a little by itself on top of the lean.
    const drift = shimmer ? Math.sin(clock.value * 0.8) * 12 : 0;
    const px = 50 + ry.value * FOIL_LIGHT.perDegree + drift;
    const py = 50 - rx.value * FOIL_LIGHT.perDegree;
    return gradientEnds(slidBox(face, FOIL_LIGHT.size, px, py), FOIL_LIGHT.angle);
  });
  const start = useDerivedValue(() => band.value.start);
  const end = useDerivedValue(() => band.value.end);
  const centre = useDerivedValue(() => ({
    x: face.x + (face.w * (50 + ry.value * FOIL_LIGHT.perDegree)) / 100,
    y:
      face.y +
      (face.h * (50 - rx.value * FOIL_LIGHT.perDegree - FOIL_LIGHT.glare.above * 100)) / 100,
  }));
  const reach = useDerivedValue(() => {
    // CSS sizes a circle to its farthest corner; the glare fades out at 48% of that.
    const c = centre.value;
    const farX = Math.max(c.x - face.x, face.x + face.w - c.x);
    const farY = Math.max(c.y - face.y, face.y + face.h - c.y);
    return Math.hypot(farX, farY) * FOIL_LIGHT.glare.radius;
  });
  return (
    <Group clip={clip}>
      <Rect
        x={face.x}
        y={face.y}
        width={face.w}
        height={face.h}
        blendMode="colorDodge"
        opacity={strength.band}
      >
        <LinearGradient start={start} end={end} colors={colors} positions={[...FOIL_LIGHT.stops]} />
      </Rect>
      <Rect
        x={face.x}
        y={face.y}
        width={face.w}
        height={face.h}
        blendMode="overlay"
        opacity={strength.glare}
      >
        <RadialGradient c={centre} r={reach} colors={glare} />
      </Rect>
    </Group>
  );
}
