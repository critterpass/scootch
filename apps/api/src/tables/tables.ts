import { hasPlus, isUnlocked, PURCHASE_STATES, type PurchaseState } from '@scootch/domain';
import { z } from 'zod';

import type { Account } from '../accounts/accounts';
import { hashFor, isoAfter, newInviteCode, newTableId, refusal } from '../accounts/ids';
import type { Bindings } from '../env';
import { createFlagReader } from '../flags';

import { tablesOf } from './table-rows';

/** A table's invite link works this long, or until the table closes. */
const tableInviteLifeMs = 24 * 60 * 60 * 1000;

/**
 * `tables.requirePlus`: on, opening a table needs a purchase state that unlocks it. The state is
 * what the phone says it is until purchases are verified on the server; the flag is the one
 * switch for the rule either way.
 */
export const tableFlags = createFlagReader({ 'tables.requirePlus': true });

/** The purchase state as the phone reports it. A claim, not yet a verified fact. */
export const purchaseClaimSchema = z.enum(PURCHASE_STATES);

type Seated = Account & { displayName: string };

export function tableStub(env: Pick<Bindings, 'TABLE'>, tableId: string) {
  return env.TABLE.get(env.TABLE.idFromName(tableId));
}

/** A person sits at one table at a time: seats anywhere else are given up first. */
async function leaveOtherTables(env: Bindings, accountId: string, staying?: string): Promise<void> {
  for (const tableId of await tablesOf(env.DB, accountId)) {
    if (tableId !== staying) await tableStub(env, tableId).remove(accountId);
  }
}

export async function openTable(
  env: Bindings,
  account: Seated,
  purchase: PurchaseState,
  now: Date,
): Promise<{ tableId: string }> {
  const requirePlus = await tableFlags.isOn(env.DB, 'tables.requirePlus');
  if (requirePlus && !isUnlocked(purchase, 'open_table')) {
    throw refusal('plus_required', 'Opening a table is part of Plus');
  }
  await leaveOtherTables(env, account.id);
  const tableId = newTableId();
  await env.DB.prepare('INSERT INTO tables (id, opened_by, opened_at) VALUES (?, ?, ?)')
    .bind(tableId, account.id, now.toISOString())
    .run();
  await tableStub(env, tableId).open(tableId, { accountId: account.id, name: account.displayName });
  return { tableId };
}

/** A link code for a table the caller is seated at. Anyone holding it can ask for a seat. */
export async function createTableInvite(
  db: D1Database,
  accountId: string,
  tableId: string,
  now: Date,
): Promise<{ code: string; expiresAt: string }> {
  const seated = await db
    .prepare(
      `SELECT 1 FROM table_seats s JOIN tables t ON t.id = s.table_id
       WHERE s.table_id = ? AND s.account_id = ? AND t.closed_at IS NULL`,
    )
    .bind(tableId, accountId)
    .first();
  if (seated === null) throw refusal('not_at_table', 'You are not at this table');
  const code = newInviteCode();
  const expiresAt = isoAfter(now, tableInviteLifeMs);
  await db.batch([
    db.prepare('DELETE FROM table_invites WHERE expires_at <= ?').bind(now.toISOString()),
    db
      .prepare(
        'INSERT INTO table_invites (code_hash, table_id, created_by, expires_at) VALUES (?, ?, ?, ?)',
      )
      .bind(await hashFor('table-invite', code), tableId, accountId, expiresAt),
  ]);
  return { code, expiresAt };
}

/**
 * Seats the caller at the table a link code points to. The holder need not be a friend of
 * anyone there: links get forwarded, which is why seats can be muted, reported and blocked.
 * A code that is unknown or expired, a closed table, and a table holding someone on either side
 * of a block with the caller all get the same answer.
 */
export async function joinTable(
  env: Bindings,
  account: Seated,
  code: string,
  purchase: PurchaseState,
  now: Date,
): Promise<{ tableId: string }> {
  const invalid = () => refusal('invite_not_valid', 'This link no longer works');
  const invite = await env.DB.prepare(
    `SELECT i.table_id FROM table_invites i JOIN tables t ON t.id = i.table_id
     WHERE i.code_hash = ? AND i.expires_at > ? AND t.closed_at IS NULL`,
  )
    .bind(await hashFor('table-invite', code), now.toISOString())
    .first<{ table_id: string }>();
  if (invite === null) throw invalid();

  const { results } = await env.DB.prepare(
    `SELECT blocked AS other FROM blocks WHERE blocker = ?1
     UNION SELECT blocker AS other FROM blocks WHERE blocked = ?1`,
  )
    .bind(account.id)
    .all<{ other: string }>();
  await leaveOtherTables(env, account.id, invite.table_id);
  const result = await tableStub(env, invite.table_id).admit({
    accountId: account.id,
    name: account.displayName,
    hasPlus: hasPlus(purchase),
    blockedWith: results.map((row) => row.other),
  });
  if (result === 'seated' || result === 'already_seated') return { tableId: invite.table_id };
  if (result === 'table_full') throw refusal('table_full', 'This table is full');
  if (result === 'pass_full') throw refusal('pass_full', 'This table has no free seat left');
  throw invalid();
}
