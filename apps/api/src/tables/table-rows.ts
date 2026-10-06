/**
 * The database rows a table's Durable Object keeps in step with itself: who holds a seat where
 * (so a ban, a block or a deleted account can find the tables to leave), and when it closed.
 */
export async function seatRowAdded(
  db: D1Database,
  tableId: string,
  accountId: string,
): Promise<void> {
  await db
    .prepare('INSERT INTO table_seats (table_id, account_id) VALUES (?, ?) ON CONFLICT DO NOTHING')
    .bind(tableId, accountId)
    .run();
}

export async function seatRowRemoved(
  db: D1Database,
  tableId: string,
  accountId: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM table_seats WHERE table_id = ? AND account_id = ?')
    .bind(tableId, accountId)
    .run();
}

/**
 * A closed table keeps its row and loses its seats. Its invite links stay until they are swept,
 * so a link opened afterwards can say the table has closed; none of them seats anyone again.
 */
export async function closeTableRows(db: D1Database, tableId: string, now: Date): Promise<void> {
  await db.batch([
    db.prepare('UPDATE tables SET closed_at = ? WHERE id = ?').bind(now.toISOString(), tableId),
    db.prepare('DELETE FROM table_seats WHERE table_id = ?').bind(tableId),
  ]);
}

/** Whether `muter` has muted nudges from `muted`. */
export async function isMuted(db: D1Database, muter: string, muted: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM mutes WHERE muter = ? AND muted = ?')
    .bind(muter, muted)
    .first();
  return row !== null;
}

/** The open tables an account holds a seat at. */
export async function tablesOf(db: D1Database, accountId: string): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT table_id FROM table_seats WHERE account_id = ?')
    .bind(accountId)
    .all<{ table_id: string }>();
  return results.map((row) => row.table_id);
}
