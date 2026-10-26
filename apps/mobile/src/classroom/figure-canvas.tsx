import { Canvas, Group } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { type Figure } from '@phusclass/art/class';

import { LayerView, type DrawContext } from './layer-view';

/**
 * One figure (a pose of Thầy Phú, a prop) on its own small canvas, `width` points wide. Its loops
 * run on `clock` when `running` names them; with none, it stands still.
 */
export function FigureCanvas({
  figure,
  width,
  clock,
  running,
  hand,
  testID,
}: {
  readonly figure: Figure;
  readonly width: number;
  readonly clock: SharedValue<number>;
  readonly running: ReadonlySet<string>;
  readonly hand: DrawContext['hand'];
  readonly testID?: string;
}) {
  const scale = width / figure.width;
  const height = figure.height * scale;
  const ctx = useMemo<DrawContext>(
    () => ({ defs: figure.defs, clock, running, overrides: {}, hand }),
    [figure, clock, running, hand],
  );
  return (
    <Canvas style={{ width, height }} {...(testID ? { testID } : {})}>
      <Group transform={[{ scale }]}>
        <LayerView layer={figure.root} ctx={ctx} />
      </Group>
    </Canvas>
  );
}
