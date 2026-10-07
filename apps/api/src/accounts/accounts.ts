import { ApiError } from '../errors';
import type { RouteContext } from '../route';

import { appleKeys, AppleKeysUnavailable, type AppleKeySource } from './apple-keys';
import { verifyAppleToken } from './apple-token';
import { hashFor, isoAfter, newAccountId, randomId, refusal } from './ids';

/** How long a phone has to finish Apple's sheet after asking for a nonce. */
const nonceLifeMs = 10 * 60 * 1000;

export type Account = {
  readonly id: string;
  /** Null until the person has chosen a name the screen accepts. */
  readonly displayName: string | null;
  readonly canBeHaunted: boolean;
  /** Who may sit down beside them with no link: their friends, or nobody. */
  readonly whoCanSit: WhoCanSit;
  readonly warned: boolean;
  readonly banned: boolean;
};

export const whoCanSit = ['friends', 'nobody'] as const;
export type WhoCanSit = (typeof whoCanSit)[number];

type AccountRow = {
  id: string;
  display_name: string | null;
  can_be_haunted: number;
  sit_with: WhoCanSit;
  warned_at: string | null;
  banned_at: string | null;
};

const accountColumns =
  'a.id, a.display_name, a.can_be_haunted, a.sit_with, a.warned_at, a.banned_at';

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    displayName: row.display_name,
    canBeHaunted: row.can_be_haunted === 1,
    whoCanSit: row.sit_with,
    warned: row.warned_at !== null,
    banned: row.banned_at !== null,
  };
}

/** The account a device is linked to, if any. */
export async function accountOfDevice(db: D1Database, deviceHash: string): Promise<Account | null> {
  const row = await db
    .prepare(
      `SELECT ${accountColumns} FROM account_devices d JOIN accounts a ON a.id = d.account_id
       WHERE d.device_hash = ?`,
    )
    .bind(deviceHash)
    .first<AccountRow>();
  return row === null ? null : toAccount(row);
}

export async function accountById(db: D1Database, id: string): Promise<Account | null> {
  const row = await db
    .prepare(`SELECT ${accountColumns} FROM accounts a WHERE a.id = ?`)
    .bind(id)
    .first<AccountRow>();
  return row === null ? null : toAccount(row);
}

/** The caller's account. Everything that needs one says so in the same way. */
export async function requireAccount(c: RouteContext): Promise<Account> {
  const account = await accountOfDevice(c.env.DB, c.var.device.hash);
  if (account === null) throw refusal('account_required', 'Sign in with Apple to do this');
  return account;
}

/** The caller's account, fit to sit at a table: it has a name and is not banned. */
export async function requireTableAccount(
  c: RouteContext,
): Promise<Account & { displayName: string }> {
  const account = await requireAccount(c);
  if (account.banned) throw refusal('not_allowed', 'Tables are not available for this account');
  if (account.displayName === null) throw refusal('name_required', 'Choose a name first');
  return { ...account, displayName: account.displayName };
}

/** A one-time value for the phone to pass to Apple's sheet. Only its hash is kept. */
export async function issueAppleNonce(
  db: D1Database,
  deviceHash: string,
  now: Date,
): Promise<string> {
  const nonce = randomId(32);
  await db.batch([
    db.prepare('DELETE FROM apple_nonces WHERE expires_at <= ?').bind(now.toISOString()),
    db
      .prepare('INSERT INTO apple_nonces (nonce_hash, device_hash, expires_at) VALUES (?, ?, ?)')
      .bind(await hashFor('apple-nonce', nonce), deviceHash, isoAfter(now, nonceLifeMs)),
  ]);
  return nonce;
}

export type SignIn = { readonly identityToken: string; readonly nonce: string };

/**
 * Signs a device in with Apple. The nonce is spent first, in one statement, so the same identity
 * token can never be accepted twice; then the token is verified against it. The account is found
 * by Apple's stable subject (hashed) or created, and the device is linked to it, replacing any
 * earlier link.
 */
export async function signInWithApple(
  db: D1Database,
  deviceHash: string,
  { identityToken, nonce }: SignIn,
  now: Date,
  keys: AppleKeySource = appleKeys,
): Promise<{ account: Account; created: boolean }> {
  const refused = () => new ApiError('unauthorized', 'Apple’s sign-in could not be verified');
  const spent = await db
    .prepare(
      `DELETE FROM apple_nonces WHERE nonce_hash = ? AND device_hash = ? AND expires_at > ?
       RETURNING nonce_hash`,
    )
    .bind(await hashFor('apple-nonce', nonce), deviceHash, now.toISOString())
    .first();
  if (spent === null) throw refused();

  let verified;
  try {
    verified = await verifyAppleToken(identityToken, { nonce, now: now.getTime(), keys });
  } catch (error) {
    if (error instanceof AppleKeysUnavailable) {
      throw new ApiError('model_unavailable', 'Apple could not be reached. Try again.');
    }
    throw error;
  }
  if (!verified.ok) {
    // The kind of failure only: never the token or a claim from it.
    console.warn('apple sign-in refused', { problem: verified.problem });
    throw refused();
  }

  const subjectHash = await hashFor('apple-subject', verified.subject);
  const inserted = await db
    .prepare(
      `INSERT INTO accounts (id, apple_subject_hash, created_at) VALUES (?, ?, ?)
       ON CONFLICT (apple_subject_hash) DO NOTHING RETURNING id`,
    )
    .bind(newAccountId(), subjectHash, now.toISOString())
    .first();
  const row = await db
    .prepare(`SELECT ${accountColumns} FROM accounts a WHERE a.apple_subject_hash = ?`)
    .bind(subjectHash)
    .first<AccountRow>();
  if (row === null) throw new ApiError('internal', 'Something went wrong');
  await db
    .prepare(
      `INSERT INTO account_devices (device_hash, account_id, linked_at) VALUES (?, ?, ?)
       ON CONFLICT (device_hash) DO UPDATE
         SET account_id = excluded.account_id, linked_at = excluded.linked_at`,
    )
    .bind(deviceHash, row.id, now.toISOString())
    .run();
  return { account: toAccount(row), created: inserted !== null };
}

/** What a phone may know about its own account. Nothing here is secret. */
export function accountView(account: Account) {
  return {
    accountId: account.id,
    displayName: account.displayName,
    canBeHaunted: account.canBeHaunted,
    whoCanSit: account.whoCanSit,
    warned: account.warned,
  };
}
