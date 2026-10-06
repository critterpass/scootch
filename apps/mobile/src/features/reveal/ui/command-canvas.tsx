import { Canvas, Group } from '@shopify/react-native-skia';
import { View } from 'react-native';

import type { DrawCommand } from '@scootch/art';

import { CommandLayer } from '../../../art/skia-commands';

export interface CommandCanvasProps {
  readonly commands: readonly DrawCommand[];
  /** The size of the space the commands were written in. */
  readonly space: { readonly width: number; readonly height: number };
  /** The width on screen, in points. The height follows the space's shape. */
  readonly width: number;
  /** Read out as one image. Left out, the drawing is decoration and is skipped. */
  readonly label?: string;
  readonly testID?: string;
}

/** Any command list of the art package's drawing model, fitted to a width. */
export function CommandCanvas({ commands, space, width, label, testID }: CommandCanvasProps) {
  const scale = width / space.width;
  const size = { width, height: space.height * scale };
  return (
    <View
      testID={testID}
      accessible={label !== undefined}
      accessibilityRole="image"
      accessibilityLabel={label}
      style={size}
    >
      <Canvas style={size}>
        <Group transform={[{ scale }]}>
          <CommandLayer commands={commands} />
        </Group>
      </Canvas>
    </View>
  );
}
