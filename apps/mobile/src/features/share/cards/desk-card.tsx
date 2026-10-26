import {
  Circle,
  Group,
  Path,
  Rect,
  RoundedRect,
  Text,
  type SkFont,
} from '@shopify/react-native-skia';
import type { ReactElement } from 'react';

import type { Carving, CarvingKind } from '@phusclass/domain/board';

import { Brand, CARD_WIDTH } from './card-parts';
import { handText } from './card-text';
import type { CardProps } from './card-props';

const CUT = '#8E5B2F';

/** The doodles, each about its own centre, from the ShareCard board's desk. */
const SHAPES: Readonly<Partial<Record<CarvingKind, string>>> = {
  star: 'M-8 6 l8 -16 l8 16 l-18 -10 h20 z',
  heart: 'M0 10 q-14 -12 -6 -20 q6 -4 6 4 q0 -8 6 -4 q8 8 -6 20 z',
  arrow: 'M-22 0 h40 m-10 -8 l10 8 l-10 8 M-22 0 l-6 -6 M-22 0 l-6 6',
  'tiny phu': 'M-14 -2 q4 -26 28 -6 q6 22 -14 24 q-18 0 -14 -18 M-8 -4 h6 M4 -4 h6 M-4 8 q4 4 8 0',
  flower:
    'M0 -4 q-10 -14 0 -16 q10 2 0 16 M4 0 q14 -10 16 0 q-2 10 -16 0 M0 4 q10 14 0 16 q-10 -2 0 -16 M-4 0 q-14 10 -16 0 q2 -10 16 0',
};

const GOLD_STAR =
  'M0 -14 L4.2 -4.6 L14 -3.6 L6.6 3 L8.8 13 L0 8 L-8.8 13 L-6.6 3 L-14 -3.6 L-4.2 -4.6 Z';

function Mark({
  carving,
  x,
  y,
  initials,
  hand,
  small,
}: {
  readonly carving: Carving;
  readonly x: number;
  readonly y: number;
  readonly initials: string;
  readonly hand: SkFont | null;
  readonly small: SkFont | null;
}): ReactElement {
  const turn = [{ translateX: x }, { translateY: y }, { rotate: (carving.turn * Math.PI) / 180 }];
  if (carving.kind === 'gold star') {
    return (
      <Group transform={turn}>
        <Path path={GOLD_STAR} color="#FFC93C" />
        <Path path={GOLD_STAR} color="#E0A030" style="stroke" strokeWidth={1.2} />
      </Group>
    );
  }
  if (carving.kind === 'carved ten') {
    return (
      <Group transform={turn} opacity={0.9}>
        <Circle cx={0} cy={0} r={24} color={CUT} style="stroke" strokeWidth={3} />
        {small !== null ? (
          <Text x={-small.getTextWidth('10') / 2} y={9} text="10" font={small} color={CUT} />
        ) : null}
      </Group>
    );
  }
  if (carving.kind === 'initials') {
    return hand !== null ? (
      <Group transform={turn} opacity={0.9}>
        <Text x={-hand.getTextWidth(initials) / 2} y={10} text={initials} font={hand} color={CUT} />
      </Group>
    ) : (
      <Group />
    );
  }
  return (
    <Group transform={turn} opacity={0.9}>
      <Path
        path={SHAPES[carving.kind] ?? SHAPES.star ?? ''}
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
        strokeJoin="round"
        color={CUT}
      />
    </Group>
  );
}

/**
 * Your desk: the carved desk from above (ShareCard board, fourth card). Every mark the store
 * keeps, placed by its own seed, none ever lost.
 */
export function DeskCard({ copy, fonts, height, carvings, initials }: CardProps): ReactElement {
  const areaTop = 96;
  const areaBottom = height - 64;
  const hand = fonts('hand', 28);
  const small = fonts('hand', 24);
  return (
    <Group>
      <Rect x={0} y={0} width={CARD_WIDTH} height={height} color="#C98B55" />
      {Array.from({ length: Math.ceil(height / 64) }, (_, index) => (
        <Rect
          key={index}
          x={0}
          y={index * 64}
          width={CARD_WIDTH}
          height={2}
          color="rgba(0,0,0,0.05)"
        />
      ))}
      <Text
        x={22}
        y={44}
        text={handText(copy.desk.title)}
        font={fonts('hand', 20)}
        color="#FFE7B8"
      />
      <Text
        x={22}
        y={64}
        text={copy.desk.footer}
        font={fonts('sans', 12)}
        color="rgba(255,241,220,0.85)"
      />

      {carvings.map((carving) => (
        <Mark
          key={carving.taskId}
          carving={carving}
          x={36 + carving.x * (CARD_WIDTH - 72)}
          y={areaTop + 20 + carving.y * (areaBottom - areaTop - 40)}
          initials={initials}
          hand={hand}
          small={small}
        />
      ))}

      <Circle cx={96} cy={areaBottom - 30} r={14} color="rgba(42,62,140,0.35)" />
      <Group transform={[{ rotate: (-18 * Math.PI) / 180 }]} origin={{ x: 270, y: areaBottom }}>
        <RoundedRect x={210} y={areaBottom - 5} width={120} height={10} r={5} color="#2E2A33" />
        <RoundedRect x={310} y={areaBottom - 5} width={20} height={10} r={3} color="#FFC93C" />
      </Group>

      <Brand
        x={22}
        y={height - 22}
        label={copy.brand}
        font={fonts('sansBold', 14)}
        color="#FFFFFF"
      />
    </Group>
  );
}
