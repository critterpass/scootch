import type { MonsterRow, WorldPieceRow } from '@scootch/domain';

import type { SharedFiles, WorldPainter } from './surface-ports';

const PREFIX = 'surface-world-';
/** Three times the widest a surface draws the world. */
export const WORLD_IMAGE_PIXELS = 1020;

/** FNV-1a over what the world is made of, so a new resident makes a new file. */
function worldHash(pieces: readonly WorldPieceRow[], monsters: readonly MonsterRow[]): string {
  const residents = new Map(monsters.map((monster) => [monster.id, monster.spec]));
  const text = JSON.stringify(
    pieces.map((piece) => [
      piece.id,
      piece.kind,
      piece.seed,
      piece.monsterId ? (residents.get(piece.monsterId) ?? null) : null,
    ]),
  );
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export interface WorldImages {
  /** The world by day, and the same world with Scootch asleep in it. */
  readonly day: string | null;
  readonly night: string | null;
}

export function worldImageNames(
  pieces: readonly WorldPieceRow[],
  monsters: readonly MonsterRow[],
): { readonly day: string; readonly night: string } {
  const hash = worldHash(pieces, monsters);
  return { day: `${PREFIX}${hash}.png`, night: `${PREFIX}${hash}-asleep.png` };
}

/**
 * Makes sure the world is in the App Group container as two PNGs, by day and asleep, and returns
 * their file names; `null` for one that could not be drawn. Pictures of an earlier world are
 * removed.
 */
export async function shareWorldImages(
  pieces: readonly WorldPieceRow[],
  monsters: readonly MonsterRow[],
  painter: WorldPainter,
  files: SharedFiles,
): Promise<WorldImages> {
  const names = worldImageNames(pieces, monsters);
  try {
    for (const other of files.list()) {
      if (other.startsWith(PREFIX) && other !== names.day && other !== names.night) {
        files.remove(other);
      }
    }
  } catch {
    // A file that could not be cleared is cleared next time.
  }
  const one = async (name: string, asleep: boolean): Promise<string | null> => {
    try {
      if (files.exists(name)) return name;
      const bytes = await painter.paint(pieces, monsters, WORLD_IMAGE_PIXELS, asleep);
      if (bytes === null) return null;
      await files.write(name, bytes);
      return name;
    } catch {
      // A surface without the picture still shows the count.
      return null;
    }
  };
  return { day: await one(names.day, false), night: await one(names.night, true) };
}
