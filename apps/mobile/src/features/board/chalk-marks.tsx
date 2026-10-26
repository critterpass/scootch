import { Canvas, Path } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { CHALK } from './chalk';

/**
 * Tally marks as the App board chalks them: a stroke for each late slip, four at most, and from
 * the fifth a long stroke through them all.
 */
export function tallyPath(count: number): string {
  let path = '';
  for (let i = 0; i < Math.min(count, 4); i += 1) path += `M${4 + i * 7} 2 L${6 + i * 7} 14 `;
  if (count >= 5) path += 'M1 12 L30 4 ';
  return path.trim();
}

/** Decoration: the row's label says how many slips it carries. */
export function TallyMarks({
  count,
  scale = 1,
}: {
  readonly count: number;
  readonly scale?: number;
}) {
  const path = useMemo(() => tallyPath(count), [count]);
  if (path === '') return null;
  return (
    <Canvas
      style={{ width: 34 * scale, height: 16 * scale }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        path={path}
        style="stroke"
        strokeWidth={2.4}
        strokeCap="round"
        color={CHALK.tally}
        transform={[{ scale }]}
      />
    </Canvas>
  );
}
