import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { type Migration, type MigrationDatabase, runMigrations } from '../../db/migrate';
import type { SqlDatabase, SqlValue } from '../table';

// A real SQLite database in memory, from Node's own module. Jest's module loader does not know
// `node:sqlite`, so it is taken from the process instead of imported.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

const MIGRATIONS_DIR = join(__dirname, '../../db/migrations');

/** Every file in the app's migrations folder, as the app itself collects them. */
function appMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => ({
      name: file.replace(/\.ts$/, ''),
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- the folder is the list
      sql: (require(join(MIGRATIONS_DIR, file)) as { sql: string }).sql,
    }));
}

export interface TestDatabase {
  readonly db: SqlDatabase;
  /** Every table the app made, without the migration log. */
  readonly tableNames: () => string[];
  readonly count: (table: string) => number;
  /** Everything stored in every table, as one string, to look for text that must not be there. */
  readonly dump: () => string;
}

/** An empty in-memory database brought up to the app's current schema by its own migrations. */
export async function openTestDatabase(): Promise<TestDatabase> {
  const sqlite = new DatabaseSync(':memory:');
  const transaction = async (task: () => Promise<void>) => {
    sqlite.exec('BEGIN');
    try {
      await task();
      sqlite.exec('COMMIT');
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  };
  const migrationDb: MigrationDatabase = {
    execAsync: (source) => Promise.resolve(sqlite.exec(source)),
    getAllAsync: <T>(source: string) => Promise.resolve(sqlite.prepare(source).all() as T[]),
    runAsync: (source, params) => Promise.resolve(sqlite.prepare(source).run(...params)),
    withTransactionAsync: transaction,
  };
  await runMigrations(migrationDb, appMigrations());

  const db: SqlDatabase = {
    getAllAsync: <T>(source: string, params: SqlValue[]) =>
      Promise.resolve(
        sqlite
          .prepare(source)
          .all(...params)
          .map((row) => ({ ...row })) as T[],
      ),
    runAsync: (source, params) => Promise.resolve(sqlite.prepare(source).run(...params)),
    withTransactionAsync: transaction,
  };
  const tableNames = () =>
    sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name <> '_migrations'")
      .all()
      .map((row) => String(row['name']));
  return {
    db,
    tableNames,
    count: (table) => Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.['n']),
    dump: () =>
      JSON.stringify(tableNames().map((table) => sqlite.prepare(`SELECT * FROM ${table}`).all())),
  };
}
