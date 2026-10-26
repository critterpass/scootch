import { useMemo } from 'react';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { buildPhu, phuPose, type PhuMood } from '@phusclass/art/class';

import { FigureCanvas } from '../../classroom/figure-canvas';
import { useHandFont } from '../../classroom/use-hand-font';

const STILL: ReadonlySet<string> = new Set();

/**
 * Thầy Phú in a small round frame, standing still: the head and shoulders of a pose, as the
 * Settings and Crisis boards draw him beside a line.
 */
export function PhuFace({
  mood,
  size,
  figureWidth,
  offsetY = 0,
  background,
  label,
}: {
  readonly mood: PhuMood;
  /** The frame's side. */
  readonly size: number;
  /** How wide the whole figure is drawn inside the frame. */
  readonly figureWidth: number;
  readonly offsetY?: number;
  readonly background: string;
  /** What VoiceOver reads; left out, the face is decoration. */
  readonly label?: string;
}) {
  const clock = useSharedValue(0);
  const hand = useHandFont();
  const figure = useMemo(() => buildPhu(phuPose(mood)), [mood]);
  return (
    <View
      {...(label === undefined
        ? ({
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
          } as const)
        : ({ accessible: true, accessibilityRole: 'image', accessibilityLabel: label } as const))}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.31,
        backgroundColor: background,
        overflow: 'hidden',
        alignItems: 'center',
      }}
    >
      <View style={{ marginTop: offsetY }}>
        <FigureCanvas
          figure={figure}
          width={figureWidth}
          clock={clock}
          running={STILL}
          hand={hand}
        />
      </View>
    </View>
  );
}
