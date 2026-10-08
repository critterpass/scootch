import { dayRowSchema, type DayRow } from '@scootch/domain';

import { createTable, type SqlDatabase, type Table } from '../table';

import { absentWhenNull } from './absent-when-null';

/** One row per Scootch day the app was opened. */
export function daysRepository(db: SqlDatabase): Table<DayRow> {
  return createTable(db, {
    name: 'days',
    schema: absentWhenNull<DayRow>(dayRowSchema, ['heardTime']),
    key: 'localDate',
    json: ['heardTime'],
  });
}
