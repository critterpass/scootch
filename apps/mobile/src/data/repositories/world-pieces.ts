import { worldPieceRowSchema, type WorldPieceRow } from '@phusclass/domain';

import { createTable, type SqlDatabase, type Table } from '../table';

/** The permanent pieces of the world. */
export function worldPiecesRepository(db: SqlDatabase): Table<WorldPieceRow> {
  return createTable(db, {
    name: 'world_pieces',
    schema: worldPieceRowSchema,
    key: 'id',
  });
}
