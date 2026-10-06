import { taskRowSchema, type TaskRow } from '@scootch/domain';

import { createTable, type SqlDatabase, type Table } from '../table';

/** The one things. A crisis text never becomes a row here. */
export function tasksRepository(db: SqlDatabase): Table<TaskRow> {
  return createTable(db, {
    name: 'tasks',
    schema: taskRowSchema,
    key: 'id',
    booleans: ['seriousOverridden', 'carriedOver', 'fitsTenMinutes', 'sharePrivate'],
    json: ['lines', 'notifications'],
  });
}
