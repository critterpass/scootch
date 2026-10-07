import { hasPlus, isUnlocked, PURCHASE_STATES, type PurchaseState } from '@scootch/domain';
import { z } from 'zod';

import type { Account } from '../accounts/accounts';
import { makeFriends } from '../accounts/friends';
import { hashFor, isoAfter, newInviteCode, newTableId, refusal } from '../accounts/ids';
import type { JoinTableResponse, OpenTableResponse } from '../contracts';
import type { Bindings } from '../env';

import { TABLE_FREE_SEATS, TABLE_MAX_SEATS } from './table-contract';
import { tablesOf } from './table-rows';

/** A table's invite link works this long, or until the table closes. */
const tableInviteLifeMs = 24 * 60 * 60 * 1000;
/** A link that has run out is remembered this long, so its page can say so, then forgotten. */
export const tableInviteRememberedMs = 7 * 24 * 60 * 60 * 1000;

/**
 * The purchase state as the phone reports it. A claim, not yet a verified fact: until purchases
 * are verified on the server, Plus is whatever the phone says it is.
 */
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

/**
 * Opens a table with the caller seated as host. Anyone with an account can: without Plus the
 * table seats two, the opener and one friend, and with Plus it seats four. The capacity is fixed
 * here and never changes, whatever happens to the opener's purchase later.
 */
export async function openTable(
  env: Bindings,
  account: Seated,
  purchase: PurchaseState,
  now: Date,
): Promise<OpenTableResponse> {
  const capacity = isUnlocked(purchase, 'open_table') ? TABLE_MAX_SEATS : TABLE_FREE_SEATS;
  await leaveOtherTables(env, account.id);
  const tableId = newTableId();
  await env.DB.prepare(
    'INSERT INTO tables (id, opened_by, opened_at, capacity) VALUES (?, ?, ?, ?)',
  )
    .bind(tableId, account.id, now.toISOString(), capacity)
    .run();
  await tableStub(env, tableId).open(
    tableId,
    { accountId: account.id, name: account.displayName },
    capacity,
  );
  return { tableId, capacity };
}

/**
 * A link code for a table the caller is seated at. The link is its maker's word for whoever
 * holds it: it can introduce as many new people as the table has seats beside its maker, each of
 * whom becomes the maker's friend on sitting down.
 */
export async function createTableInvite(
  db: D1Database,
  accountId: string,
  tableId: string,
  now: Date,
): Promise<{ code: string; expiresAt: string }> {
  const seated = await db
    .prepare(
      `SELECT t.capacity FROM table_seats s JOIN tables t ON t.id = s.table_id
       WHERE s.table_id = ? AND s.account_id = ? AND t.closed_at IS NULL`,
    )
    .bind(tableId, accountId)
    .first<{ capacity: number }>();
  if (seated === null) throw refusal('not_at_table', 'You are not at this table');
  const code = newInviteCode();
  const expiresAt = isoAfter(now, tableInviteLifeMs);
  await db.batch([
    db
      .prepare('DELETE FROM table_invites WHERE expires_at <= ?')
      .bind(isoAfter(now, -tableInviteRememberedMs)),
    db
      .prepare(
        `INSERT INTO table_invites (code_hash, table_id, created_by, expires_at, introductions_left)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        await hashFor('table-invite', code),
        tableId,
        accountId,
        expiresAt,
        seated.capacity - 1,
      ),
  ]);
  return { code, expiresAt };
}

/** Accounts on either side of a block with this one. */
async function blockedWith(db: D1Database, accountId: string): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT blocked AS other FROM blocks WHERE blocker = ?1
       UNION SELECT blocker AS other FROM blocks WHERE blocked = ?1`,
    )
    .bind(accountId)
    .all<{ other: string }>();
  return results.map((row) => row.other);
}

/** Whether the account is seated at the table, or a friend of someone who is (or of `also`). */
async function knownAtTable(
  db: D1Database,
  accountId: string,
  tableId: string,
  also: string | null,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM table_seats WHERE table_id = ?2 AND account_id = ?1
       UNION ALL
       SELECT 1 FROM friendships f
       WHERE (f.account_a = ?1 AND (f.account_b = ?3 OR f.account_b IN
               (SELECT account_id FROM table_seats WHERE table_id = ?2)))
          OR (f.account_b = ?1 AND (f.account_a = ?3 OR f.account_a IN
               (SELECT account_id FROM table_seats WHERE table_id = ?2)))
       LIMIT 1`,
    )
    .bind(accountId, tableId, also)
    .first();
  return row !== null;
}

/** Whether a friend of the account is seated at the table and lets friends sit down beside them. */
async function welcomeAtTable(
  db: D1Database,
  accountId: string,
  tableId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM table_seats s
       JOIN accounts a ON a.id = s.account_id AND a.sit_with = 'friends'
       JOIN friendships f
         ON (f.account_a = ?1 AND f.account_b = s.account_id)
         OR (f.account_b = ?1 AND f.account_a = s.account_id)
       WHERE s.table_id = ?2 LIMIT 1`,
    )
    .bind(accountId, tableId)
    .first();
  return row !== null;
}

const invalid = () => refusal('invite_not_valid', 'This link no longer works');

/** Asks the table for a seat, and answers as the routes do. */
async function takeSeat(
  env: Bindings,
  account: Seated,
  tableId: string,
  purchase: PurchaseState,
  blocked: readonly string[],
): Promise<'seated' | 'full' | 'pass_full' | 'gone'> {
  await leaveOtherTables(env, account.id, tableId);
  const result = await tableStub(env, tableId).admit({
    accountId: account.id,
    name: account.displayName,
    hasPlus: hasPlus(purchase),
    blockedWith: blocked,
  });
  if (result === 'seated' || result === 'already_seated') return 'seated';
  if (result === 'table_full') return 'full';
  return result === 'pass_full' ? 'pass_full' : 'gone';
}

function refuse(result: 'full' | 'pass_full' | 'gone'): never {
  if (result === 'full') throw refusal('table_full', 'This table is full');
  if (result === 'pass_full') throw refusal('pass_full', 'This table has no free seat left');
  throw invalid();
}

/**
 * Seats the caller at the table a link code points to. Tables are for friends, and a link from
 * someone seated is that person's word for its holder: a holder who is not yet a friend of
 * anyone there is introduced by the link, and becomes its maker's friend on sitting down, where
 * the maker can see them, remove them or block them. A link introduces only as many people as
 * the table has seats beside its maker, so one that has leaked seats no further strangers
 * (`friends_only`); friends of someone seated can use it for as long as it lasts.
 *
 * A code that is unknown or expired, a closed table, and a table holding someone on either side
 * of a block with the caller all get the same answer.
 */
export async function joinTable(
  env: Bindings,
  account: Seated,
  code: string,
  purchase: PurchaseState,
  now: Date,
): Promise<JoinTableResponse> {
  const codeHash = await hashFor('table-invite', code);
  const invite = await env.DB.prepare(
    `SELECT i.table_id, i.created_by, t.capacity FROM table_invites i
     JOIN tables t ON t.id = i.table_id
     WHERE i.code_hash = ? AND i.expires_at > ? AND t.closed_at IS NULL`,
  )
    .bind(codeHash, now.toISOString())
    .first<{ table_id: string; created_by: string; capacity: number }>();
  if (invite === null) throw invalid();
  const blocked = await blockedWith(env.DB, account.id);
  if (blocked.includes(invite.created_by)) throw invalid();

  const known =
    invite.created_by === account.id ||
    (await knownAtTable(env.DB, account.id, invite.table_id, invite.created_by));
  if (!known) {
    const introduced = await env.DB.prepare(
      `UPDATE table_invites SET introductions_left = introductions_left - 1
       WHERE code_hash = ? AND introductions_left > 0 RETURNING code_hash`,
    )
      .bind(codeHash)
      .first();
    if (introduced === null) throw refusal('friends_only', 'This table is for friends');
  }
  const result = await takeSeat(env, account, invite.table_id, purchase, blocked);
  if (result !== 'seated') {
    if (!known) {
      await env.DB.prepare(
        'UPDATE table_invites SET introductions_left = introductions_left + 1 WHERE code_hash = ?',
      )
        .bind(codeHash)
        .run();
    }
    refuse(result);
  }
  if (!known) await makeFriends(env.DB, account.id, invite.created_by, now);
  return { tableId: invite.table_id, capacity: invite.capacity, madeFriends: !known };
}

/** Seats the caller at an open table a friend of theirs is seated at, with no link. */
export async function joinFriendsTable(
  env: Bindings,
  account: Seated,
  tableId: string,
  purchase: PurchaseState,
): Promise<JoinTableResponse> {
  const table = await env.DB.prepare(
    'SELECT capacity FROM tables WHERE id = ? AND closed_at IS NULL',
  )
    .bind(tableId)
    .first<{ capacity: number }>();
  // A table that does not exist, one with no friend at it, and one whose friends take nobody
  // without a link all get the same answer.
  if (table === null || !(await welcomeAtTable(env.DB, account.id, tableId))) {
    throw refusal('friends_only', 'This table is for friends');
  }
  const result = await takeSeat(
    env,
    account,
    tableId,
    purchase,
    await blockedWith(env.DB, account.id),
  );
  if (result !== 'seated') refuse(result === 'gone' ? 'gone' : result);
  return { tableId, capacity: table.capacity, madeFriends: false };
}
