import { weekRecordRowSchema, type WeekRecordRow } from '@scootch/domain';

import { createTable, type SqlDatabase, type Table } from '../table';

/** Each week's written parts. */
export function weekRecordsRepository(db: SqlDatabase): Table<WeekRecordRow> {
  return createTable(db, {
    name: 'week_records',
    schema: weekRecordRowSchema,
    key: 'week',
  });
}
