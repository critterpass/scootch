import { recordBarRowSchema, type RecordBarRow } from '@scootch/domain';

import { createTable, type SqlDatabase, type Table } from '../table';

/** One bar of the record per finished day. */
export function recordBarsRepository(db: SqlDatabase): Table<RecordBarRow> {
  return createTable(db, {
    name: 'record_bars',
    schema: recordBarRowSchema,
    key: 'localDate',
  });
}
