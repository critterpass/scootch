// For tests only: nothing in the app imports this file, so it is never bundled.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { runMigrations, type Migration, type MigrationDatabase } from '../db/migrate';

import type { DataDatabase, SqlValue } from './data-database';

// A real SQLite database in memory, from Node's own module. Jest's module loader does not know
// `node:sqlite`, so it is taken from the process instead of imported.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

/** Every migration in the app's folder, read the way the app reads them: one file each. */
function appMigrations(): Migration[] {
  const folder = join(__dirname, '../db/migrations');
  return readdirSync(folder)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => ({
      name: file.replace(/\.ts$/, ''),
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- the folder is the list
      sql: (require(join(folder, file)) as { sql: string }).sql,
    }));
}

export type TestDatabase = DataDatabase &
  MigrationDatabase & {
    /** The first column of every row a query returns. */
    column(source: string): unknown[];
  };

/** A fresh in-memory database with every app migration applied. */
export async function openMigratedDatabase(): Promise<TestDatabase> {
  const sqlite = new DatabaseSync(':memory:');
  const db: TestDatabase = {
    execAsync: (source) => Promise.resolve(sqlite.exec(source)),
    getAllAsync: <T>(source: string, params: SqlValue[] | string[] = []) =>
      Promise.resolve(sqlite.prepare(source).all(...params) as T[]),
    getFirstAsync: <T>(source: string, params: SqlValue[] = []) =>
      Promise.resolve((sqlite.prepare(source).get(...params) as T | undefined) ?? null),
    runAsync: (source: string, params: SqlValue[] | string[]) =>
      Promise.resolve(sqlite.prepare(source).run(...params)),
    withTransactionAsync: async (task) => {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    column: (source) =>
      sqlite
        .prepare(source)
        .all()
        .map((row) => Object.values(row)[0]),
  };
  await runMigrations(db, appMigrations());
  return db;
}
