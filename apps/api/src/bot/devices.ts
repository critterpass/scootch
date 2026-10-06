/** Devices registered from `from` up to, not including, `to`, counted per language. */
export async function newDevicesBetween(
  db: D1Database,
  from: Date | null,
  to: Date,
): Promise<{ total: number; text: string }> {
  const { results } = await db
    .prepare(
      `SELECT language, COUNT(*) AS devices FROM devices
       WHERE created_at >= ? AND created_at < ?
       GROUP BY language ORDER BY language`,
    )
    .bind(from === null ? '' : from.toISOString(), to.toISOString())
    .all<{ language: string; devices: number }>();
  const total = results.reduce((sum, row) => sum + row.devices, 0);
  const split = results.map((row) => `${row.language} ${row.devices}`).join(', ');
  return { total, text: total === 0 ? '0' : `${total} (${split})` };
}
