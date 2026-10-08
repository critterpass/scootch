import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { roundRect, type DrawCommand } from '@scootch/art';

import { CommandCanvas } from '../../reveal/ui/command-canvas';

/** The foil the chosen plan is edged in: pink, sky, butter, violet and round to pink again. */
const FOIL = ['#FF8FC8', '#8FE3FF', '#FFE38A', '#B59BFF', '#FF8FC8'] as const;
/** The paler foil a small PLUS badge is cut from. */
export const BADGE_FOIL = ['#FFC2E0', '#BDEFFF', '#FFF0B0', '#D5C6FF'] as const;
/** The boards run every foil at 120 degrees: left to right, leaning down. */
const FOIL_DEGREES = 120;

/** The two ends of the line a CSS gradient of this angle runs along in a box. */
export function gradientLine(
  width: number,
  height: number,
  degrees: number,
): { readonly from: readonly [number, number]; readonly to: readonly [number, number] } {
  const angle = (degrees * Math.PI) / 180;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  const cx = width / 2;
  const cy = height / 2;
  return { from: [cx - dx * half, cy - dy * half], to: [cx + dx * half, cy + dy * half] };
}

export interface FoilEdgeProps {
  readonly radius: number;
  /** How wide the edge is, in points. */
  readonly edge?: number;
  /** What the inside is filled with. Left out, the box is foil all the way through. */
  readonly fill?: string;
  /** The foil's colours along its line. The chosen plan's when left out. */
  readonly colors?: readonly string[];
  readonly style?: ViewProps['style'];
  readonly children?: ReactNode;
}

/**
 * A box edged in foil, as the board edges the chosen plan: a band of colours behind a filled
 * inside, or foil right through when nothing fills it. It draws once it knows its own size.
 */
export function FoilEdge({
  radius,
  edge = 2,
  fill,
  colors = FOIL,
  style,
  children,
}: FoilEdgeProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const commands = useMemo((): DrawCommand[] => {
    if (size === null) return [];
    const box = { x: 0, y: 0, w: size.width, h: size.height };
    const line = gradientLine(size.width, size.height, FOIL_DEGREES);
    const foil: DrawCommand = {
      op: 'paint',
      path: roundRect(box, radius),
      paint: {
        kind: 'linear',
        from: line.from,
        to: line.to,
        stops: colors.map((color, index) => [index / (colors.length - 1), color, 1] as const),
      },
      alpha: 1,
      blend: 'normal',
    };
    if (fill === undefined) return [foil];
    return [
      foil,
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
  }, [size, radius, edge, fill, colors]);
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
