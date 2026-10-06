import { hashFor } from '../accounts/ids';
import type { Language, TableInvitePage } from '../contracts';
import type { Bindings } from '../env';

import { tableStub } from './tables';

type InviteRow = {
  table_id: string;
  expires_at: string;
  closed_at: string | null;
  host_name: string | null;
};

/**
 * What an invite link shows someone who has not sat down: who made it, and for an open table who
 * is seated, each with a label unless they hid it. Null for a code nobody made, or one long
 * forgotten.
 *
 * The database is asked first, so an unknown code, a link that has run out and a closed table
 * never reach the table's Durable Object. An open table is asked for its seats in one call that
 * reads its storage once and writes nothing; a hibernating table is woken for that read and goes
 * back to sleep with its sockets and its alarm as they were.
 */
export async function readInvitePage(
  env: Bindings,
  code: string,
  language: Language,
  now: Date,
): Promise<TableInvitePage | null> {
  const row = await env.DB.prepare(
    `SELECT i.table_id, i.expires_at, t.closed_at, a.display_name AS host_name
     FROM table_invites i
     JOIN tables t ON t.id = i.table_id
     JOIN accounts a ON a.id = i.created_by
     WHERE i.code_hash = ?`,
  )
    .bind(await hashFor('table-invite', code))
    .first<InviteRow>();
  if (row === null) return null;

  const closed = (closedAt: string | null): TableInvitePage => ({
    state: 'closed',
    hostName: row.host_name,
    closedAt,
    seats: [],
  });
  if (row.closed_at !== null) return closed(row.closed_at);
  if (row.expires_at <= now.toISOString()) return closed(null);

  const seats = await tableStub(env, row.table_id).seatsOutside(language);
  // The table closed a moment ago and its row does not say so yet.
  if (seats === null) return closed(null);
  return { state: 'open', hostName: row.host_name, closedAt: null, seats };
}
