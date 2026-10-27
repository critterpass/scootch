import { Canvas, Group, Path } from '@shopify/react-native-skia';

/** The App board's line icons, drawn on a 24-unit grid. Decoration: the control carries the label. */
const ICONS = {
  mic: ['M9 6 a3 3 0 0 1 6 0 v5 a3 3 0 0 1 -6 0 Z', 'M5 11a7 7 0 0 0 14 0M12 18v3'],
  keyboard: [
    'M5 6 H19 A3 3 0 0 1 22 9 V15 A3 3 0 0 1 19 18 H5 A3 3 0 0 1 2 15 V9 A3 3 0 0 1 5 6 Z',
    'M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8',
  ],
  up: ['M12 19V5M5 12l7-7 7 7'],
  hand: [
    'M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V3.5a1.5 1.5 0 0 1 3 0V11M14 11V5a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 4 15l-1-3a1.5 1.5 0 0 1 2.6-1.4L8 13',
  ],
  pencil: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  offline: [
    'M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01M3 3l18 18',
  ],
  chevronDown: ['M5 9 L12 16 L19 9'],
  sliders: [
    'M4 7h10M18 7h2M4 17h4M12 17h8',
    'M18 7 a2 2 0 1 1 -4 0 a2 2 0 1 1 4 0',
    'M12 17 a2 2 0 1 1 -4 0 a2 2 0 1 1 4 0',
  ],
  lock: ['M7 11 V8 a5 5 0 0 1 10 0 V11', 'M6 11 H18 V20 H6 Z'],
  calendar: [
    'M6 4 H18 A3 3 0 0 1 21 7 V18 A3 3 0 0 1 18 21 H6 A3 3 0 0 1 3 18 V7 A3 3 0 0 1 6 4 Z',
    'M3 10h18M9 4v17M15 4v17',
  ],
  book: ['M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z', 'M9 9h6M9 13h4'],
  check: ['M20 6L9 17l-5-5'],
  eraser: ['M7 21h10M5 15l9-9 5 5-9 9H6z'],
} as const;

export type ClassIconName = keyof typeof ICONS;

export function ClassIcon({
  name,
  color,
  size = 18,
  weight = 2,
}: {
  readonly name: ClassIconName;
  readonly color: string;
  readonly size?: number;
  readonly weight?: number;
}) {
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ scale: size / 24 }]}>
        {ICONS[name].map((path) => (
          <Path
            key={path}
            path={path}
            style="stroke"
            strokeWidth={weight}
            strokeCap="round"
            strokeJoin="round"
            color={color}
          />
        ))}
      </Group>
    </Canvas>
  );
}
