import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { memo, useMemo, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { VIEW_SIZE, type DrawCommand } from '@scootch/art';

import { toSkiaNodes, type SkiaNode } from './skia-nodes';

function element(node: SkiaNode, key: number): ReactElement {
  switch (node.kind) {
    case 'group':
      return (
        <Group
          key={key}
          {...(node.matrix ? { matrix: [...node.matrix] } : {})}
          {...(node.clip === undefined ? {} : { clip: node.clip })}
        >
          {node.children.map(element)}
        </Group>
      );
    case 'fill':
      return (
        <Path
          key={key}
          path={node.path}
          color={node.color}
          opacity={node.opacity}
          fillType={node.fillType}
        />
      );
    case 'stroke':
      return (
        <Path
          key={key}
          path={node.path}
          color={node.color}
          opacity={node.opacity}
          style="stroke"
          strokeWidth={node.width}
          strokeCap="round"
          strokeJoin="round"
        />
      );
  }
}

export interface CommandLayerProps {
  readonly commands: readonly DrawCommand[];
  /** Shows or hides the whole layer; a shared value changes it without a React render. */
  readonly opacity?: SharedValue<number>;
}

/**
 * One command list as Skia nodes, in the 200 by 200 drawing space. The nodes are built once per
 * list and kept, so a drawing that does not change costs nothing after its first frame.
 */
export const CommandLayer = memo(function CommandLayer({ commands, opacity }: CommandLayerProps) {
  const elements = useMemo(() => toSkiaNodes(commands).map(element), [commands]);
  return <Group {...(opacity ? { opacity } : {})}>{elements}</Group>;
});

export interface CharacterCanvasProps {
  /** Width and height of the canvas, in points. */
  readonly size: number;
  readonly testID?: string;
  readonly accessibilityLabel?: string;
  /** Command layers, drawn in the 200 by 200 drawing space. */
  readonly children: ReactNode;
}

/**
 * A square canvas that fits the whole drawing space to `size`. The ground line of the drawing
 * space always lands at the same share of the height, so characters of one size stand on one
 * baseline whatever their pose.
 */
export function CharacterCanvas({
  size,
  testID,
  accessibilityLabel,
  children,
}: CharacterCanvasProps) {
  const scale = size / VIEW_SIZE;
  return (
    <View
      testID={testID}
      accessible={accessibilityLabel !== undefined}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size }}
    >
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ scale }]}>{children}</Group>
      </Canvas>
    </View>
  );
}
