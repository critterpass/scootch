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
 * Makes sure the task's monster is in the App Group container as a PNG and returns its file name,
 * or `null` when there is no monster or it could not be drawn. Images of other monsters are
 * removed, so the container holds one at most.
 */
export async function shareMonsterImage(
  monster: MonsterRow | null,
  painter: MonsterPainter,
  files: SharedFiles,
): Promise<string | null> {
  const name = monster ? monsterImageName(monster) : null;
  try {
    for (const other of files.list()) {
      if (other.startsWith(PREFIX) && other !== name) files.remove(other);
    }
    if (!monster || name === null) return null;
    if (files.exists(name)) return name;
    const bytes = await painter.paint(monster.spec, MONSTER_IMAGE_PIXELS);
    if (bytes === null) return null;
    await files.write(name, bytes);
    return name;
  } catch {
    // A surface without the monster still shows the task.
    return null;
  }
}
