import {
  carvingFromRow,
  carvingToRow,
  type Carving,
  type CarvingRow,
} from '@phusclass/domain/board';

import type { DataDatabase } from './data-database';

/** Every mark on the desk, oldest first. */
export async function readCarvings(db: DataDatabase): Promise<Carving[]> {
  const rows = await db.getAllAsync<CarvingRow>(
    'SELECT task_id, kind, x, y, turn, at FROM carvings ORDER BY at, task_id',
    [],
  );
  return rows.map(carvingFromRow);
}

/** Carves a mark. A task carves once; nothing is ever updated or removed. */
export async function addCarving(db: DataDatabase, carving: Carving): Promise<void> {
  const row = carvingToRow(carving);
  await db.runAsync(
    'INSERT OR IGNORE INTO carvings (task_id, kind, x, y, turn, at) VALUES (?, ?, ?, ?, ?, ?)',
    [row.task_id, row.kind, row.x, row.y, row.turn, row.at],
  );
}
