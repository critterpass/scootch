import { Canvas, Path } from '@shopify/react-native-skia';

import { useT } from '../../i18n/i18n-provider';

import { ink } from './class-style';

/** The App board's tally: four strokes, and the fifth struck through them. */
export function tallyPath(count: number): string {
  let path = '';
  for (let i = 0; i < Math.min(count, 4); i += 1) path += `M${4 + i * 7} 2 L${6 + i * 7} 14 `;
  if (count >= 5) path += 'M1 12 L30 4 ';
  return path.trim();
}

/** Late slips as red tally marks, read out as a count. */
export function TallyMarks({ count }: { readonly count: number }) {
  const t = useT();
  if (count <= 0) return null;
  return (
    <Canvas
      style={{ width: 34, height: 16 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('desk.tallies', { count })}
    >
      <Path
        path={tallyPath(count)}
        style="stroke"
        strokeWidth={2.4}
        strokeCap="round"
        color={ink.red}
      />
    </Canvas>
  );
}
