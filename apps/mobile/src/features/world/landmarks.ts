import type { IsoDate, WorldPieceRow } from '@scootch/domain';

import type { PieceArt } from './piece-kit';
import { lighthouse } from './landmarks/lighthouse';

/**
 * What a stored world piece is. The row's own `kind` knows a monster's home and a quiet piece; a
 * landmark is told apart by its seed, which starts with this and then names its drawing. A
 * landmark's seed is never rolled: it has one drawing and one place.
 */
export type PieceKind = WorldPieceRow['kind'] | 'landmark';
const LANDMARK_SEED = 'landmark:';

export function pieceKind(piece: Pick<WorldPieceRow, 'kind' | 'seed'>): PieceKind {
  return piece.seed.startsWith(LANDMARK_SEED) ? 'landmark' : piece.kind;
}

/** The drawing a landmark's seed names. */
export function landmarkName(piece: Pick<WorldPieceRow, 'seed'>): string {
  return piece.seed.slice(LANDMARK_SEED.length);
}

/** Every landmark drawing, by name. None of them is in the pieces folder. */
export const LANDMARK_ART: Readonly<Record<string, PieceArt>> = { lighthouse };

/** The lifetime lighthouse: one row with a fixed id, so landing it twice changes nothing. */
export function lighthousePiece(addedOn: IsoDate): WorldPieceRow {
  return {
    id: 'landmark-lighthouse',
    kind: 'plain',
    monsterId: null,
    x: 0.5,
    y: 0,
    seed: `${LANDMARK_SEED}lighthouse`,
    addedOn,
  };
}

/** How many of the pieces are things that were finished: every piece but the landmarks. */
export function finishedThings(pieces: readonly Pick<WorldPieceRow, 'kind' | 'seed'>[]): number {
  return pieces.filter((piece) => pieceKind(piece) !== 'landmark').length;
}

interface PieceStore {
  get(id: string): Promise<WorldPieceRow | null | undefined>;
  put(row: WorldPieceRow): Promise<unknown>;
}

/**
 * Adds the lighthouse to the world of someone who bought lifetime, once and for good. True when
 * it landed just now.
 */
export async function landLighthouse(pieces: PieceStore, addedOn: IsoDate): Promise<boolean> {
  const piece = lighthousePiece(addedOn);
  if (await pieces.get(piece.id)) return false;
  await pieces.put(piece);
  return true;
}
