import { Canvas, Group } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { DrawCommand, Path } from '@scootch/art';

import { CommandLayer } from '../../../art/skia-commands';
import { useScreenStyle } from '../../../ui/use-screen-style';

/** The dark page the sheet and the poster are set on. */
export const NIGHT = '#120F0D';

interface Blob {
  /** Where its centre rests, in points; a negative `x` counts from the trailing edge. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
  readonly alpha: number;
  /** How far it drifts and back, in points. */
  readonly drift: readonly [number, number];
}

/** The board's three lights: ember at the top, a pink one to the side, a cool one low down. */
const BLOBS: readonly Blob[] = [
  { x: 70, y: 130, radius: 320, color: '#F0562E', alpha: 0.6, drift: [60, 40] },
  { x: -20, y: 340, radius: 290, color: '#E86AD0', alpha: 0.32, drift: [-50, 70] },
  { x: 150, y: 630, radius: 300, color: '#4FB6FF', alpha: 0.22, drift: [60, 70] },
];

const everywhere = (width: number, height: number): Path => [
  ['M', -200, -200],
  ['L', width + 200, -200],
  ['L', width + 200, height + 200],
  ['L', -200, height + 200],
  ['Z'],
];

function Light(props: {
  readonly commands: readonly DrawCommand[];
  readonly drift: readonly [number, number];
  readonly clock: SharedValue<number>;
}) {
  const { commands, drift, clock } = props;
  const transform = useDerivedValue(() => [
    { translateX: drift[0] * clock.value },
    { translateY: drift[1] * clock.value },
    { scale: 1 + 0.2 * clock.value },
  ]);
  return (
    <Group transform={transform}>
      <CommandLayer commands={commands} />
    </Group>
  );
}

/**
 * The slow glow behind the sheet (`[data-aurora]`): three soft lights on the dark page, drifting
 * a little and back, with grain over them. Where nothing may move they rest.
 */
export function Aurora() {
  const { width, height } = useWindowDimensions();
  const { reducedMotion } = useScreenStyle();
  const clock = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      clock.value = 0;
      return;
    }
    clock.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [reducedMotion, clock]);
  const lights = useMemo(
    () =>
      BLOBS.map((blob): DrawCommand[] => [
        {
          op: 'paint',
          path: everywhere(width, height),
          paint: {
            kind: 'radial',
            centre: [blob.x < 0 ? width + blob.x : blob.x, blob.y],
            radius: blob.radius,
            stops: [
              [0, blob.color, blob.alpha],
              [0.35, blob.color, blob.alpha * 0.7],
              [1, blob.color, 0],
            ],
          },
          alpha: 1,
          blend: 'normal',
        },
      ]),
    [width, height],
  );
  const grain = useMemo(
    (): DrawCommand[] => [
      {
        op: 'paint',
        path: everywhere(width, height),
        paint: { kind: 'grain', size: 1.2 },
        alpha: 0.28,
        blend: 'overlay',
      },
    ],
    [width, height],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        {lights.map((commands, index) => (
          <Light
            key={index}
            commands={commands}
            drift={BLOBS[index]?.drift ?? [0, 0]}
            clock={clock}
          />
        ))}
        <CommandLayer commands={grain} />
      </Canvas>
    </View>
  );
}
