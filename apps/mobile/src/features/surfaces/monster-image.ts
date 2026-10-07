import type { MonsterRow } from '@scootch/domain';

import type { MonsterPainter, SharedFiles } from './surface-ports';

const PREFIX = 'surface-monster-';
/** Three times the largest size a surface draws the monster at. */
export const MONSTER_IMAGE_PIXELS = 288;

/** FNV-1a over the spec, so a monster that shrank gets a new file and the widgets see the change. */
function specHash(monster: MonsterRow): string {
  const text = JSON.stringify(monster.spec);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function monsterImageName(monster: MonsterRow): string {
  return `${PREFIX}${specHash(monster)}.png`;
}

/**
 * Makes sure each of these monsters is in the App Group container as a PNG and returns the file
 * name of each by monster id, `null` for one that could not be drawn. Images of any other monster
 * are removed, so the container holds only what the surfaces show.
 */
export async function shareMonsterImages(
  monsters: readonly MonsterRow[],
  painter: MonsterPainter,
  files: SharedFiles,
): Promise<ReadonlyMap<string, string | null>> {
  const names = new Map(monsters.map((monster) => [monster.id, monsterImageName(monster)]));
  const kept = new Set(names.values());
  const shared = new Map<string, string | null>();
  try {
    for (const other of files.list()) {
      if (other.startsWith(PREFIX) && !kept.has(other)) files.remove(other);
    }
  } catch {
    // A file that could not be cleared is cleared next time.
  }
  for (const monster of monsters) {
    const name = names.get(monster.id) ?? null;
    try {
      if (name === null) continue;
      if (!files.exists(name)) {
        const bytes = await painter.paint(monster.spec, MONSTER_IMAGE_PIXELS);
        if (bytes === null) throw new Error('not drawn');
        await files.write(name, bytes);
      }
      shared.set(monster.id, name);
    } catch {
      // A surface without the monster still shows the task.
      shared.set(monster.id, null);
    }
  }
  return shared;
}
