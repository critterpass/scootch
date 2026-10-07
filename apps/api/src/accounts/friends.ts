import type { FriendInvitePage } from '../contracts';

import { hashFor, isoAfter, newInviteCode, refusal } from './ids';

/** A friend link works for a week, once. */
const friendInviteLifeMs = 7 * 24 * 60 * 60 * 1000;
/** A link that was used or has run out is remembered this long, so its page can say so. */
const friendInviteRememberedMs = 7 * 24 * 60 * 60 * 1000;
/** Unused links one account may hold at a time. */
const openInvitesPerAccount = 10;

/** A pair in the one order the `friendships` table stores it. */
export function pairOf(one: string, other: string): [string, string] {
  return one < other ? [one, other] : [other, one];
}

export async function areFriends(db: D1Database, one: string, other: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM friendships WHERE account_a = ? AND account_b = ?')
    .bind(...pairOf(one, other))
    .first();
  return row !== null;
}

/** True when either has blocked the other. */
export async function isBlockedBetween(
  db: D1Database,
  one: string,
  other: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      'SELECT 1 FROM blocks WHERE (blocker = ?1 AND blocked = ?2) OR (blocker = ?2 AND blocked = ?1)',
    )
    .bind(one, other)
    .first();
  return row !== null;
}

/** A friend link's code. It makes friends and does nothing else. */
export async function createFriendInvite(
  db: D1Database,
  accountId: string,
  now: Date,
): Promise<{ code: string; expiresAt: string }> {
  const code = newInviteCode();
  const expiresAt = isoAfter(now, friendInviteLifeMs);
  await db.batch([
    db
      .prepare('DELETE FROM friend_invites WHERE expires_at <= ?')
      .bind(isoAfter(now, -friendInviteRememberedMs)),
    // The oldest unused links beyond the cap stop working, so links cannot pile up without end.
    db
      .prepare(
        `DELETE FROM friend_invites WHERE account_id = ?1 AND used_at IS NULL AND code_hash NOT IN (
           SELECT code_hash FROM friend_invites WHERE account_id = ?1 AND used_at IS NULL
           ORDER BY expires_at DESC LIMIT ?2)`,
      )
      .bind(accountId, openInvitesPerAccount - 1),
    db
      .prepare('INSERT INTO friend_invites (code_hash, account_id, expires_at) VALUES (?, ?, ?)')
      .bind(await hashFor('friend-invite', code), accountId, expiresAt),
  ]);
  return { code, expiresAt };
}

const invalidInvite = () => refusal('invite_not_valid', 'This link no longer works');

/**
 * Accepts a friend link. The code is spent in one statement, so it makes one friendship. A code
 * that is unknown, expired, used, one's own, or from someone on either side of a block gets the
 * same answer, which says nothing about the person behind it.
 */
export async function acceptFriendInvite(
  db: D1Database,
  accountId: string,
  code: string,
  now: Date,
): Promise<{ friendId: string }> {
  const codeHash = await hashFor('friend-invite', code);
  const invite = await db
    .prepare(
      `SELECT account_id FROM friend_invites
       WHERE code_hash = ? AND expires_at > ? AND used_at IS NULL`,
    )
    .bind(codeHash, now.toISOString())
    .first<{ account_id: string }>();
  if (invite === null || invite.account_id === accountId) throw invalidInvite();
  if (await isBlockedBetween(db, accountId, invite.account_id)) throw invalidInvite();

  const spent = await db
    .prepare(
      `UPDATE friend_invites SET used_at = ? WHERE code_hash = ? AND used_at IS NULL
       RETURNING code_hash`,
    )
    .bind(now.toISOString(), codeHash)
    .first();
  if (spent === null) throw invalidInvite();
  await makeFriends(db, accountId, invite.account_id, now);
  return { friendId: invite.account_id };
}

/** Makes two accounts friends. Already friends, nothing changes. */
export async function makeFriends(
  db: D1Database,
  one: string,
  other: string,
  now: Date,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO friendships (account_a, account_b, created_at) VALUES (?, ?, ?)
       ON CONFLICT DO NOTHING`,
    )
    .bind(...pairOf(one, other), now.toISOString())
    .run();
}

/**
 * What a friend link's page shows: who it is from while it still works, and `gone` with no name
 * once it has been used or has run out. Null for a code nobody made, or one long forgotten.
 */
export async function readFriendInvitePage(
  db: D1Database,
  code: string,
  now: Date,
): Promise<FriendInvitePage | null> {
  const row = await db
    .prepare(
      `SELECT i.expires_at, i.used_at, a.display_name FROM friend_invites i
       JOIN accounts a ON a.id = i.account_id WHERE i.code_hash = ?`,
    )
    .bind(await hashFor('friend-invite', code))
    .first<{ expires_at: string; used_at: string | null; display_name: string | null }>();
  if (row === null) return null;
  if (row.used_at !== null || row.expires_at <= now.toISOString()) {
    return { state: 'gone', fromName: null };
  }
  return { state: 'valid', fromName: row.display_name };
}

export async function removeFriend(db: D1Database, one: string, other: string): Promise<void> {
  await db
    .prepare('DELETE FROM friendships WHERE account_a = ? AND account_b = ?')
    .bind(...pairOf(one, other))
    .run();
}

export type Friend = { accountId: string; displayName: string | null; canBeHaunted: boolean };

/** The caller's friends: the only list of people the API ever gives out. */
export async function listFriends(db: D1Database, accountId: string): Promise<Friend[]> {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.display_name, a.can_be_haunted FROM friendships f
       JOIN accounts a ON a.id = CASE WHEN f.account_a = ?1 THEN f.account_b ELSE f.account_a END
       WHERE f.account_a = ?1 OR f.account_b = ?1 ORDER BY f.created_at`,
    )
    .bind(accountId)
    .all<{ id: string; display_name: string | null; can_be_haunted: number }>();
  return results.map((row) => ({
    accountId: row.id,
    displayName: row.display_name,
    canBeHaunted: row.can_be_haunted === 1,
  }));
}
