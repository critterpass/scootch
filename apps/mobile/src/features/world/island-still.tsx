import { Group } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { buildScootch, GROUND_Y, VIEW_SIZE } from '@scootch/art';
import type { MonsterRow, WorldPieceRow } from '@scootch/domain';

import { CommandLayer } from '../../art/skia-commands';

import { islandCommands } from './island-commands';
import { ISLAND_SPACE, layoutIsland, SCOOTCH_AT } from './island-layout';
import { inLandingOrder } from './world-layout';

export interface IslandStillProps {
  readonly pieces: readonly WorldPieceRow[];
  readonly monsters: readonly MonsterRow[];
  /** Width and height of the square it is drawn into, in the canvas's own units. */
  readonly side: number;
  /** Scootch asleep in the middle, as on a finished day; otherwise pleased with it all. */
  readonly asleep: boolean;
  /** Leaves out what floats around Scootch, for a surface that draws the sleep marks itself. */
  readonly withoutEffects?: boolean;
}

/**
 * The island as one still drawing inside a Skia canvas or an off-screen picture, with Scootch
 * standing between what is behind him and what is in front. Scootch is drawn in tomato, like
 * every drawing of him outside the app's own screens.
 */
export function IslandStill({ pieces, monsters, side, asleep, withoutEffects }: IslandStillProps) {
  const unit = side / ISLAND_SPACE;
  const { drawing, scootchScale } = useMemo(() => {
    const layout = layoutIsland(inLandingOrder(pieces, monsters));
    return {
      drawing: islandCommands(layout, new Map(monsters.map((one) => [one.id, one]))),
      scootchScale: layout.scootchScale,
    };
  }, [pieces, monsters]);
  const scootch = useMemo(
    () =>
      buildScootch(
        {
          mood: asleep ? 'asleep' : 'pleased',
          attitude: 'cheeky',
          workMode: null,
          reducedMotion: true,
          hat: null,
        },
        undefined,
        { withoutEffects: withoutEffects === true },
      ),
    [asleep, withoutEffects],
  );
  return (
    <Group>
      <Group transform={[{ scale: unit }]}>
        <CommandLayer commands={drawing.behind} />
      </Group>
      <Group
        transform={[
          { translateX: (SCOOTCH_AT.x - (VIEW_SIZE / 2) * scootchScale) * unit },
          { translateY: (SCOOTCH_AT.y - GROUND_Y * scootchScale) * unit },
          { scale: scootchScale * unit },
        ]}
      >
        <CommandLayer commands={scootch} />
      </Group>
      <Group transform={[{ scale: unit }]}>
        <CommandLayer commands={drawing.inFront} />
      </Group>
    </Group>
  );
}
