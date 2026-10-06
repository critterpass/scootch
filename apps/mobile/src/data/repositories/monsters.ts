import { monsterRowSchema, type MonsterRow } from '@scootch/domain';

import { createTable, type SqlDatabase, type Table } from '../table';

/** Each task's monster, and its card once caught. */
export function monstersRepository(db: SqlDatabase): Table<MonsterRow> {
  return createTable(db, {
    name: 'monsters',
    schema: monsterRowSchema,
    key: 'id',
    json: ['spec'],
  });
}
