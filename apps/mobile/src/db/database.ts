import { type Migration, type MigrationDatabase, runMigrations } from './migrate';

export const DATABASE_NAME = 'scootch.db';

// Every file in ./migrations is one migration, named by its file. Adding a schema change is adding
// a file; nothing else lists them.
const files = require.context('./migrations', false, /\.ts$/);

const migrations: Migration[] = files.keys().map((key) => ({
  name: key.replace(/^\.\//, '').replace(/\.ts$/, ''),
  sql: files<{ sql: string }>(key).sql,
}));

/** Brings a new or existing database up to the current schema. Runs once, before the first screen. */
export async function prepareDatabase(db: MigrationDatabase): Promise<void> {
  await runMigrations(db, migrations);
}
