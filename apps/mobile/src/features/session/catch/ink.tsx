import { Canvas, DashPathEffect, Path } from '@shopify/react-native-skia';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';

import { STAGE } from './math';

/** One drawn line: an SVG path, stroked. */
export interface InkStroke {
  readonly d: string;
  readonly width: number;
  readonly color: string;
  readonly opacity?: number;
  /** Dashes: how long each is, and the gap after it. */
  readonly dash?: readonly [number, number];
  /** A filled shape in place of a line. */
  readonly fill?: boolean;
  /** How much of the path is drawn, from its start: 0 to 1. All of it when left out. */
  readonly end?: number;
}

export interface InkHandle {
  /** Replaces what is drawn. */
  readonly draw: (strokes: readonly InkStroke[]) => void;
}

/**
 * Lines that change as a finger moves: a rope, a fishing line, the trail of a swipe. It is drawn
 * again by itself, so the scene around it is not.
 */
export const Ink = forwardRef<
  InkHandle,
  { readonly style?: ViewProps['style']; readonly first?: readonly InkStroke[] }
>(function Ink({ style, first = [] }, ref) {
  const [strokes, setStrokes] = useState<readonly InkStroke[]>(first);
  useImperativeHandle(ref, () => ({ draw: setStrokes }), []);
  return (
    <Canvas pointerEvents="none" style={[styles.ink, style]}>
      {strokes.map((stroke, index) => (
        <Path
          key={index}
          path={stroke.d}
          style={stroke.fill ? 'fill' : 'stroke'}
          strokeWidth={stroke.width}
          strokeCap="round"
          strokeJoin="round"
          color={stroke.color}
          opacity={stroke.opacity ?? 1}
          end={stroke.end ?? 1}
        >
          {stroke.dash ? <DashPathEffect intervals={[stroke.dash[0], stroke.dash[1]]} /> : null}
        </Path>
      ))}
    </Canvas>
  );
});

const styles = StyleSheet.create({
  // A little past the board, so a line that runs off it (a rod, a rope's tail) is not cut short.
  ink: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: STAGE.width + 60,
    height: STAGE.height + 60,
  },
});
