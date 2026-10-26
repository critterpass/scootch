import { parkedThoughtRowSchema, type ParkedThoughtRow } from '@phusclass/domain';

import { createTable, type SqlDatabase, type Table } from '../table';

/** Thoughts parked during a session. */
export function parkedThoughtsRepository(db: SqlDatabase): Table<ParkedThoughtRow> {
  return createTable(db, {
    name: 'parked_thoughts',
    schema: parkedThoughtRowSchema,
    key: 'id',
  });
}
