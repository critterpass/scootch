/** The longest session there is. A beat with no end is forgotten once this has passed. */
export const longestSessionMinutes = 180;

/** Beats that began at or before this moment are over, whether or not an end ever arrived. */
function forgottenBefore(now: number): string {
  return new Date(now - longestSessionMinutes * 60 * 1000).toISOString();
}

/**
 * A device's session began or ended. A device holds one row at most, so a second start moves its
 * clock and never counts twice. Every beat also clears the rows whose time has run out.
 */
export async function recordBeat(
  db: D1Database,
  deviceHash: string,
  hunting: boolean,
): Promise<void> {
  const now = Date.now();
  await db.batch([
    db.prepare('DELETE FROM hunting_beats WHERE began_at <= ?').bind(forgottenBefore(now)),
    hunting
      ? db
          .prepare(
            `INSERT INTO hunting_beats (device_hash, began_at) VALUES (?1, ?2)
             ON CONFLICT (device_hash) DO UPDATE SET began_at = ?2`,
          )
          .bind(deviceHash, new Date(now).toISOString())
      : db.prepare('DELETE FROM hunting_beats WHERE device_hash = ?').bind(deviceHash),
  ]);
}

/** How many devices are in a session now, the caller's own included. Exact, not rounded. */
export async function huntingCount(db: D1Database): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS count FROM hunting_beats WHERE began_at > ?')
    .bind(forgottenBefore(Date.now()))
    .first<{ count: number }>();
  return row?.count ?? 0;
}
