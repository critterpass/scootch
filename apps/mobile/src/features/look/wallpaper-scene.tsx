import {
  Circle,
  Fill,
  Group,
  LinearGradient,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { buildScootch, VIEW_SIZE } from '@scootch/art';
import type { MonsterRow, WorldPieceRow } from '@scootch/domain';

import { CommandLayer } from '../../art/skia-commands';
import { IslandStill } from '../world/island-still';

/** The three wallpapers, in the order the page offers them. */
export const WALLPAPERS = ['world', 'perched', 'night'] as const;
export type WallpaperKind = (typeof WALLPAPERS)[number];

/** A Lock Screen's pixels on the largest phone; iOS crops it for the others. */
export const WALLPAPER_PIXELS = { width: 1290, height: 2796 } as const;

export interface WallpaperSceneProps {
  readonly kind: WallpaperKind;
  readonly pieces: readonly WorldPieceRow[];
  readonly monsters: readonly MonsterRow[];
  readonly width: number;
  readonly height: number;
}

/** The night's stars: a sparse grid of faint points, the same every time. */
function Stars({ width, height }: { readonly width: number; readonly height: number }) {
  const [stepX, stepY] = [width * 0.117, width * 0.148];
  const points: { x: number; y: number }[] = [];
  for (let y = stepY / 2; y < height * 0.72; y += stepY) {
    for (let x = stepX / 2; x < width; x += stepX) points.push({ x, y });
  }
  return (
    <Group opacity={0.28}>
      {points.map(({ x, y }) => (
        <Circle key={`${x}/${y}`} cx={x} cy={y} r={width * 0.005} color="#FFFFFF" />
      ))}
    </Group>
  );
}

/**
 * One wallpaper as a Skia drawing, for a canvas on the page and for the picture that is saved:
 * the person's own world low on warm paper, Scootch perched under the clock, or the world asleep
 * under a few stars. The clock is the Lock Screen's own, so the top third is left clear. The
 * Shortcuts action draws the same three from Swift (`targets/widgets/_shared/Wallpaper.swift`).
 */
export function WallpaperScene({ kind, pieces, monsters, width, height }: WallpaperSceneProps) {
  const perched = useMemo(
    () =>
      buildScootch({
        mood: 'pleased',
        attitude: 'cheeky',
        workMode: null,
        reducedMotion: true,
        hat: null,
      }),
    [],
  );
  // The island is a little wider than the screen and its near edge runs off the bottom.
  const side = width * 1.12;
  const island = (
    <Group transform={[{ translateX: (width - side) / 2 }, { translateY: height - side * 0.93 }]}>
      <IslandStill pieces={pieces} monsters={monsters} side={side} asleep />
    </Group>
  );

  if (kind === 'perched') {
    const box = width * 1.22;
    return (
      <Group>
        <Fill>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#F6C9B4', '#F0A98A']} />
        </Fill>
        <Group
          transform={[
            { translateX: (width - box) / 2 },
            { translateY: height * 0.146 },
            { scale: box / VIEW_SIZE },
          ]}
        >
          <CommandLayer commands={perched} />
        </Group>
      </Group>
    );
  }
  if (kind === 'night') {
    return (
      <Group>
        <Fill>
          <RadialGradient
            c={vec(width / 2, height)}
            r={height * 0.7}
            colors={['#2B2420', '#0E0C0A']}
          />
        </Fill>
        <Stars width={width} height={height} />
        {island}
        <Fill color="rgba(8,6,5,0.22)" />
      </Group>
    );
  }
  return (
    <Group>
      <Fill>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#F0E7D8', '#DFCFB6']} />
      </Fill>
      {island}
    </Group>
  );
}
