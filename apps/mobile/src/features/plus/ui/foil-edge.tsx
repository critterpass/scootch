import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { roundRect, type DrawCommand } from '@scootch/art';

import { CommandCanvas } from '../../reveal/ui/command-canvas';

/** The foil the chosen plan is edged in: pink, sky, butter, violet and round to pink again. */
const FOIL = ['#FF8FC8', '#8FE3FF', '#FFE38A', '#B59BFF', '#FF8FC8'] as const;

export interface FoilEdgeProps {
  readonly radius: number;
  /** How wide the edge is, in points. */
  readonly edge?: number;
  /** What the inside is filled with. */
  readonly fill: string;
  readonly style?: ViewProps['style'];
  readonly children: ReactNode;
}

/**
 * A box edged in foil, as the board edges the chosen plan: a band of four colours behind a
 * filled inside. It draws once it knows its own size.
 */
export function FoilEdge({ radius, edge = 2, fill, style, children }: FoilEdgeProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const commands = useMemo((): DrawCommand[] => {
    if (size === null) return [];
    const box = { x: 0, y: 0, w: size.width, h: size.height };
    return [
      {
        op: 'paint',
        path: roundRect(box, radius),
        paint: {
          kind: 'linear',
          from: [0, size.height],
          to: [size.width, 0],
          stops: FOIL.map((color, index) => [index / (FOIL.length - 1), color, 1] as const),
        },
        alpha: 1,
        blend: 'normal',
      },
      {
        op: 'fill',
        path: roundRect(
          { x: edge, y: edge, w: size.width - edge * 2, h: size.height - edge * 2 },
          radius - edge,
        ),
        color: fill,
        alpha: 1,
        rule: 'nonzero',
      },
    ];
  }, [size, radius, edge, fill]);
  return (
    <View
      style={style}
      onLayout={({ nativeEvent }) => {
        const { width, height } = nativeEvent.layout;
        if (size?.width !== width || size.height !== height) setSize({ width, height });
      }}
    >
      {size === null ? null : (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CommandCanvas commands={commands} space={size} width={size.width} />
        </View>
      )}
      {children}
    </View>
  );
}
