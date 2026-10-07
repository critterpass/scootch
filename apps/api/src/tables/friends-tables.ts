import type { FriendsTablesResponse } from '../contracts';

type Row = {
  table_id: string;
  capacity: number;
  taken: number;
  friend_id: string;
  friend_name: string | null;
};

/**
 * The open tables the caller could sit down at now: a friend is seated there, a seat is free,
 * the caller is not already there, and nobody there is on either side of a block with them.
 * Only the caller's own friends are named; anyone else at the table is a count.
 */
export async function friendsTables(
  db: D1Database,
  accountId: string,
): Promise<FriendsTablesResponse> {
  const { results } = await db
    .prepare(
      `SELECT t.id AS table_id, t.capacity, s.account_id AS friend_id,
              a.display_name AS friend_name,
              (SELECT COUNT(*) FROM table_seats x WHERE x.table_id = t.id) AS taken
       FROM friendships f
       JOIN table_seats s
         ON s.account_id = CASE WHEN f.account_a = ?1 THEN f.account_b ELSE f.account_a END
       JOIN tables t ON t.id = s.table_id AND t.closed_at IS NULL
       JOIN accounts a ON a.id = s.account_id
       WHERE (f.account_a = ?1 OR f.account_b = ?1)
         AND NOT EXISTS (
           SELECT 1 FROM table_seats mine WHERE mine.table_id = t.id AND mine.account_id = ?1)
         AND NOT EXISTS (
           SELECT 1 FROM table_seats o JOIN blocks b
             ON (b.blocker = ?1 AND b.blocked = o.account_id)
             OR (b.blocked = ?1 AND b.blocker = o.account_id)
           WHERE o.table_id = t.id)
       ORDER BY t.opened_at DESC, f.created_at`,
    )
    .bind(accountId)
    .all<Row>();
  const tables = new Map<string, FriendsTablesResponse['tables'][number]>();
  for (const row of results) {
    if (row.taken >= row.capacity) continue;
    const table = tables.get(row.table_id) ?? {
      tableId: row.table_id,
      capacity: row.capacity,
      seatsTaken: row.taken,
      friends: [],
    };
    table.friends.push({ accountId: row.friend_id, displayName: row.friend_name });
    tables.set(row.table_id, table);
  }
  return { tables: [...tables.values()] };
}
