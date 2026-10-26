import { useMemo } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { buildPhu, phuPose, type PhuMood } from '@phusclass/art/class';

import { FigureCanvas } from '../../classroom/figure-canvas';
import type { DrawContext } from '../../classroom/layer-view';

const STILL: ReadonlySet<string> = new Set();

/** Thầy Phú alone, standing still in one mood: at the foot of the board, on the logbook page. */
export function PhuFigure({
  mood,
  width,
  hand,
  testID,
}: {
  readonly mood: PhuMood;
  readonly width: number;
  readonly hand: DrawContext['hand'];
  readonly testID?: string;
}) {
  const figure = useMemo(() => buildPhu(phuPose(mood)), [mood]);
  const clock = useSharedValue(0);
  return (
    <FigureCanvas
      figure={figure}
      width={width}
      clock={clock}
      running={STILL}
      hand={hand}
      {...(testID ? { testID } : {})}
    />
  );
}
