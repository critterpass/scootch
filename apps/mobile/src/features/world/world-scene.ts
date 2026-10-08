import { buildScootch, GROUND_Y, VIEW_SIZE, type DrawCommand } from '@scootch/art';
import type { Id, MonsterRow, WorldPieceRow } from '@scootch/domain';

import { islandCommands } from './island-commands';
import { ISLAND_SPACE, layoutIsland, SCOOTCH_AT } from './island-layout';
import { inLandingOrder } from './world-layout';

/**
 * The world as one still drawing, for a picture of it: the island with everything living on it,
 * and Scootch asleep in the middle, exactly where the screen stands him. It is drawn in a square
 * space of `size`.
 */
export function worldScene(
  pieces: readonly WorldPieceRow[],
  monsters: readonly MonsterRow[],
): { readonly commands: DrawCommand[]; readonly size: number } {
  const layout = layoutIsland(inLandingOrder(pieces, monsters));
  const byId = new Map<Id, MonsterRow>(monsters.map((monster) => [monster.id, monster]));
  const island = islandCommands(layout, byId);
  const scale = layout.scootchScale;
  return {
    commands: [
      ...island.behind,
      { op: 'save' },
      {
        op: 'transform',
        matrix: [
          scale,
          0,
          0,
          scale,
          SCOOTCH_AT.x - (VIEW_SIZE / 2) * scale,
          SCOOTCH_AT.y - GROUND_Y * scale,
        ],
      },
      ...buildScootch({ mood: 'asleep', attitude: 'cheeky', workMode: null, reducedMotion: true }),
      { op: 'restore' },
      ...island.inFront,
    ],
    size: ISLAND_SPACE,
  };
}
