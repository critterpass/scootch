import { Canvas, Path } from '@shopify/react-native-skia';

/** "Phú", as he signs the logbook in red pen: the App board's signature, 46 by 16. */
export const SIGNATURE_PATH =
  'M 2.6 14.0 C 3.6 9.9 4.2 5.7 5.2 1.6 C 7.8 0.0 12.0 2.1 9.9 5.2 C 8.3 7.3 5.2 6.8 4.2 5.7 ' +
  'M 6.2 7.3 C 7.8 4.7 9.4 2.1 10.4 1.0 C 10.9 4.2 9.4 8.8 9.9 12.5 C 10.4 9.4 12.5 6.8 13.5 8.8 ' +
  'C 14.0 10.9 13.5 12.5 15.1 11.4 C 16.1 9.9 16.1 8.3 16.6 7.8 C 16.6 10.4 17.2 12.5 18.7 11.4 ' +
  'C 19.8 10.4 19.8 8.8 20.3 7.8 C 20.3 10.4 20.8 12.5 22.9 10.9 C 27.0 8.8 33.3 8.3 42.6 4.7 ' +
  'M 18.2 4.7 L 20.8 2.1';

/** Decoration: the row's label says it is signed. */
export function Signature({
  color,
  scale = 1,
}: {
  readonly color: string;
  readonly scale?: number;
}) {
  return (
    <Canvas
      style={{ width: 46 * scale, height: 16 * scale }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        path={SIGNATURE_PATH}
        style="stroke"
        strokeWidth={1.7}
        strokeCap="round"
        strokeJoin="round"
        color={color}
        opacity={0.8}
        transform={[{ scale }]}
      />
    </Canvas>
  );
}
