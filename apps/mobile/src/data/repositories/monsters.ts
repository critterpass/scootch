import { monsterRowSchema, type MonsterRow } from '@scootch/domain';

import { createTable, type SqlDatabase, type Table } from '../table';

import { absentWhenNull } from './absent-when-null';

/** Each task's monster, and its card once caught. */
export function monstersRepository(db: SqlDatabase): Table<MonsterRow> {
  return createTable(db, {
    name: 'monsters',
    schema: absentWhenNull<MonsterRow>(monsterRowSchema, ['guessMinutes', 'oddWord']),
    key: 'id',
    json: ['spec', 'signed'],
  });
}
