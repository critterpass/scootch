import type { Attitude, Language, MonsterRow, WorldPieceRow } from '@scootch/domain';

import { helperLine } from '@scootch/voice';

import { pieceKind } from '../world/landmarks';
import { inLandingOrder } from '../world/world-layout';

import type { SharedFiles, WorldPainter } from './surface-ports';

const PREFIX = 'surface-world-';
/** Three times the widest a surface draws the world. */
export const WORLD_IMAGE_PIXELS = 1020;
/** Three times the widest a widget draws Scootch asleep beside the newest piece. */
export const REST_IMAGE_PIXELS = 660;

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

/** The world's newest piece, as the widgets show it on a day with nothing waiting. */
export interface NewestPiece {
  /** The name of the monster living there. `null` for a quiet piece, which is never named. */
  readonly resident: string | null;
  /** Scootch asleep beside that piece alone, or `null` when it could not be drawn. */
  readonly image: string | null;
}

/**
 * Scootch at rest, as the small and medium widgets show a day with nothing waiting: asleep beside
 * the world's newest piece. It is part of the shared snapshot, so
 * `targets/_shared/SurfaceSnapshot.swift` decodes exactly these fields.
 */
export interface SurfaceAtRest {
  /** What the small widget says, and the medium one's first line. */
  readonly line: string;
  /**
   * The medium widget's second line: what joined the world last, by its monster's name. `null`
   * while nothing lives in the world, and for a quiet piece.
   */
  readonly joined: string | null;
  /** The file Scootch asleep beside that piece was drawn to, or `null` when there is none. */
  readonly image: string | null;
}

/** What the widgets say and show at rest, in the person's language. The words are offline lines. */
export function atRest(
  language: Language,
  attitude: Attitude,
  piece?: NewestPiece | null,
): SurfaceAtRest {
  const resident = piece?.resident ?? null;
  return {
    line: helperLine(language, attitude, 'widgetRest'),
    joined:
      resident === null
        ? null
        : helperLine(language, attitude, 'widgetJoined').replace('{name}', () => resident),
    image: piece?.image ?? null,
  };
}

export interface WorldImages {
  /** The world by day, and the same world with Scootch asleep in it. */
  readonly day: string | null;
  readonly night: string | null;
  /** Scootch alone, for the wallpaper he is perched on. He never changes, so it is drawn once. */
  readonly scootch: string | null;
  /** The piece that landed last. `null` while nothing lives in the world. */
  readonly newest: NewestPiece | null;
}

export const SCOOTCH_IMAGE = 'surface-scootch-pleased.png';
/** Three times the widest the perched wallpaper draws him. */
const SCOOTCH_IMAGE_PIXELS = 1560;

export function worldImageNames(
  pieces: readonly WorldPieceRow[],
  monsters: readonly MonsterRow[],
): { readonly day: string; readonly night: string } {
  const hash = worldHash(pieces, monsters);
  return { day: `${PREFIX}${hash}.png`, night: `${PREFIX}${hash}-asleep.png` };
}

/** The piece that landed last. A landmark is not a thing that was finished, so it is never it. */
export function newestPiece(
  pieces: readonly WorldPieceRow[],
  monsters: readonly MonsterRow[],
): WorldPieceRow | null {
  const ordinary = pieces.filter((piece) => pieceKind(piece) !== 'landmark');
  const ordered = inLandingOrder(ordinary, monsters);
  return ordered[ordered.length - 1] ?? null;
}

/** The file Scootch asleep beside that piece is drawn to: a new one when the piece changes. */
export function restImageName(piece: WorldPieceRow, monsters: readonly MonsterRow[]): string {
  return `${PREFIX}${worldHash([piece], monsters)}-rest.png`;
}

/**
 * Makes sure the world is in the App Group container as PNGs (by day, asleep, and Scootch asleep
 * beside its newest piece) and returns their file names; `null` for one that could not be drawn.
 * Pictures of an earlier world are removed.
 */
export async function shareWorldImages(
  pieces: readonly WorldPieceRow[],
  monsters: readonly MonsterRow[],
  painter: WorldPainter,
  files: SharedFiles,
): Promise<WorldImages> {
  const names = worldImageNames(pieces, monsters);
  const latest = newestPiece(pieces, monsters);
  const rest = latest ? restImageName(latest, monsters) : null;
  const kept: readonly (string | null)[] = [names.day, names.night, rest];
  try {
    for (const other of files.list()) {
      if (other.startsWith(PREFIX) && !kept.includes(other)) files.remove(other);
    }
  } catch {
    // A file that could not be cleared is cleared next time.
  }
  const one = async (
    name: string,
    asleep: boolean,
    shown: readonly WorldPieceRow[] = pieces,
    pixels = WORLD_IMAGE_PIXELS,
  ): Promise<string | null> => {
    try {
      if (files.exists(name)) return name;
      const bytes = await painter.paint(shown, monsters, pixels, asleep);
      if (bytes === null) return null;
      await files.write(name, bytes);
      return name;
    } catch {
      // A surface without the picture still shows the count.
      return null;
    }
  };
  let scootch: string | null = null;
  try {
    if (!files.exists(SCOOTCH_IMAGE)) {
      const bytes = await painter.paintScootch(SCOOTCH_IMAGE_PIXELS);
      if (bytes !== null) await files.write(SCOOTCH_IMAGE, bytes);
    }
    scootch = files.exists(SCOOTCH_IMAGE) ? SCOOTCH_IMAGE : null;
  } catch {
    // The perched wallpaper is then drawn without him by the Shortcuts action.
  }
  // The newest piece is drawn as an island of its own: the painter stands a world's only
  // resident beside Scootch, with sand between them.
  const resident = latest?.monsterId
    ? (monsters.find((monster) => monster.id === latest.monsterId)?.name ?? null)
    : null;
  return {
    day: await one(names.day, false),
    night: await one(names.night, true),
    scootch,
    newest:
      latest && rest
        ? { resident, image: await one(rest, true, [latest], REST_IMAGE_PIXELS) }
        : null,
  };
}
