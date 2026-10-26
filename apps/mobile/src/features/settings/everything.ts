import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { DataDatabase } from '../../data/data-database';

/** Every table the phone keeps for the person, in the order a delete can take them. */
export const PERSON_TABLES = [
  'slips',
  'sessions',
  'logbook',
  'carvings',
  'tasks',
  'kv',
  'settings',
] as const;

export interface ExportFile {
  readonly app: string;
  readonly version: string;
  readonly exportedAt: string;
  readonly tables: Readonly<Record<(typeof PERSON_TABLES)[number], readonly unknown[]>>;
}

/** Everything on the phone, as one plain object. */
export async function exportEverything(db: DataDatabase, now: number): Promise<ExportFile> {
  const tables = {} as Record<(typeof PERSON_TABLES)[number], unknown[]>;
  for (const table of PERSON_TABLES) {
    tables[table] = await db.getAllAsync<unknown>(`SELECT * FROM ${table}`, []);
  }
  return {
    app: 'phusclass',
    version: Constants.expoConfig?.version ?? '',
    exportedAt: new Date(now).toISOString(),
    tables,
  };
}

/** Writes the export as a JSON file and opens the share sheet with it. */
export async function shareExport(db: DataDatabase, now: number): Promise<void> {
  const data = await exportEverything(db, now);
  const file = new File(Paths.cache, `phusclass-${data.exportedAt.slice(0, 10)}.json`);
  file.create({ overwrite: true });
  await file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
}

/** Empties every table the phone keeps for the person, in one transaction. */
export async function wipePhone(db: DataDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of PERSON_TABLES) await db.runAsync(`DELETE FROM ${table}`, []);
  });
}
