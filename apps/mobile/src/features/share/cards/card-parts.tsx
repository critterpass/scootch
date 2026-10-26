import { Group, Path, RoundedRect, Text, type SkFont } from '@shopify/react-native-skia';
import type { ReactElement } from 'react';

/** Every card is drawn 360 points wide; the export scales it to 1080 pixels. */
export const CARD_WIDTH = 360;
/** The post (4:5) and the story (9:16). */
export const CARD_HEIGHTS = { post: 450, story: 640 } as const;
export type CardShape = keyof typeof CARD_HEIGHTS;
export const EXPORT_SCALE = 3;

/** His signature: an ugly, cursive "Phú", from the Tuition board. Drawn in an 84 × 30 box. */
export const SIGNATURE =
  'M5 27 C7 19 8 11 10 3 C15 0 23 4 19 10 C16 14 10 13 8 11 M12 14 C15 9 18 4 20 2 C21 8 18 17 19 24 ' +
  'C20 18 24 13 26 17 C27 21 26 24 29 22 C31 19 31 16 32 15 C32 20 33 24 36 22 C38 20 38 17 39 15 ' +
  'C39 20 40 24 44 21 C52 17 64 16 82 9 M35 9 L40 4';

/** His red check, from the ShareCard board. Drawn in a 120 × 100 box. */
export const CHECK = 'M12 56 Q26 62 42 86 Q64 38 112 8';

export const RED = '#D42A24';
export const BLUE_INK = '#2A3E8C';

export function Signature({
  x,
  y,
  width,
  color,
  stroke = 2.6,
}: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly color: string;
  readonly stroke?: number;
}): ReactElement {
  const scale = width / 84;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale }]}>
      <Path
        path={SIGNATURE}
        style="stroke"
        strokeWidth={stroke / scale}
        strokeCap="round"
        strokeJoin="round"
        color={color}
      />
    </Group>
  );
}

export function Check({
  x,
  y,
  width,
  stroke = 11,
}: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly stroke?: number;
}): ReactElement {
  const scale = width / 120;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale }]}>
      <Path
        path={CHECK}
        style="stroke"
        strokeWidth={stroke}
        strokeCap="round"
        strokeJoin="round"
        color={RED}
      />
    </Group>
  );
}

/** The app's mark and name, bottom left, as every card on the board signs off. */
export function Brand({
  x,
  y,
  label,
  font,
  color,
  size = 24,
}: {
  readonly x: number;
  /** The baseline of the name. */
  readonly y: number;
  readonly label: string;
  readonly font: SkFont | null;
  readonly color: string;
  readonly size?: number;
}): ReactElement {
  const top = y - size * 0.75;
  const tick = size / 120;
  return (
    <Group>
      <RoundedRect x={x} y={top} width={size} height={size} r={size * 0.29} color={RED} />
      <Group
        transform={[
          { translateX: x + size * 0.18 },
          { translateY: top + size * 0.2 },
          { scale: tick * 0.64 },
        ]}
      >
        <Path
          path={CHECK}
          style="stroke"
          strokeWidth={14}
          strokeCap="round"
          strokeJoin="round"
          color="#FFFFFF"
        />
      </Group>
      {font !== null ? (
        <Text x={x + size + 8} y={y} text={label} font={font} color={color} />
      ) : null}
    </Group>
  );
}
