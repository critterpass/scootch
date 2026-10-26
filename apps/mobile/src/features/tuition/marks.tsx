import { Canvas, Group, Path } from '@shopify/react-native-skia';

/** Line marks the tuition and timetable boards draw, on a 24-unit grid. Decoration only. */
const MARKS = {
  close: ['M6 6l12 12M18 6L6 18'],
  back: ['M15 5l-7 7 7 7'],
  lock: [
    'M7.5 11 H16.5 A2.5 2.5 0 0 1 19 13.5 V18.5 A2.5 2.5 0 0 1 16.5 21 H7.5 A2.5 2.5 0 0 1 5 18.5 V13.5 A2.5 2.5 0 0 1 7.5 11 Z',
    'M8 11V8a4 4 0 0 1 8 0v3',
  ],
} as const;

export type MarkName = keyof typeof MARKS;

export function Mark({
  name,
  color,
  size = 16,
  weight = 2.4,
}: {
  readonly name: MarkName;
  readonly color: string;
  readonly size?: number;
  readonly weight?: number;
}) {
  return (
    <Canvas
      style={{ width: size, height: size }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Group transform={[{ scale: size / 24 }]}>
        {MARKS[name].map((path) => (
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
