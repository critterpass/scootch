import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';

export interface EdgeFadeProps {
  /** The page's own colour: what the content fades into. */
  readonly color: string;
  readonly width: number;
  readonly height: number;
  /** Which edge of the screen it lies along: solid at that edge, clear toward the content. */
  readonly edge: 'top' | 'bottom';
  /** How much of the height, from the edge, is wholly the page's colour. */
  readonly solid?: number;
}

/**
 * Where a list goes under a bar or a dock: the page's own colour, solid along the edge and clear
 * toward the list, so what scrolls there fades out instead of being cut off on a line. It is a
 * picture and takes no touch.
 */
export function EdgeFade({ color, width, height, edge, solid = 0.6 }: EdgeFadeProps) {
  const clear = `${color}00`;
  const [from, to] = edge === 'top' ? [0, height] : [height, 0];
  return (
    <View pointerEvents="none" style={{ width, height }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, from)}
            end={vec(0, to)}
            colors={[color, color, clear]}
            positions={[0, solid, 1]}
          />
        </Rect>
      </Canvas>
    </View>
  );
}
