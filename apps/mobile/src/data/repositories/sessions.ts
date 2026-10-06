import { sessionRowSchema, type SessionRow } from '@scootch/domain';

import { createTable, type SqlDatabase, type Table } from '../table';

/** Sittings. The row with no end is the running session. */
export function sessionsRepository(db: SqlDatabase): Table<SessionRow> {
  return createTable(db, {
    name: 'sessions',
    schema: sessionRowSchema,
    key: 'id',
  });
}
