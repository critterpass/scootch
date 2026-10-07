import { monsterSpecSchema } from '../../../../packages/domain/src/contracts/art';

import type { HauntPage, ReceivedHaunt } from '../contracts';

import { isoAfter } from './ids';

/** One haunt per friend in this long. */
export const hauntEveryMs = 7 * 24 * 60 * 60 * 1000;
/**
 * A haunt nobody caught or shooed is gone after this long: a week, so that by the time a friend
 * may be haunted again the last one is no longer waiting.
 */
export const hauntLifeMs = hauntEveryMs;

export type HauntRow = {
  id: string;
  body_type: string;
  seed: string;
  dare: string;
  anonymous: number;
  created_at: string;
  sender: string;
  sender_name: string | null;
  spec: string | null;
  name: string | null;
  title: string | null;
  flavour_text: string | null;
  language: string | null;
  signature: string | null;
};

export function hauntView(row: HauntRow): ReceivedHaunt {
  return {
    id: row.id,
    bodyType: row.body_type as ReceivedHaunt['bodyType'],
    seed: row.seed,
    dare: row.dare,
    sentAt: row.created_at,
    expiresAt: isoAfter(new Date(row.created_at), hauntLifeMs),
    // An anonymous haunt names nobody, to the phone as well as on the screen.
    from: row.anonymous === 1 ? null : { accountId: row.sender, displayName: row.sender_name },
    spec: row.spec === null ? null : monsterSpecSchema.parse(JSON.parse(row.spec)),
    words:
      row.name === null || row.flavour_text === null || row.signature === null
        ? null
        : {
            name: row.name,
            title: row.title ?? '',
            flavourText: row.flavour_text,
            language: row.language === 'vi' ? 'vi' : 'en',
            signature: row.signature,
          },
  };
}

export const hauntColumns = `h.id, h.body_type, h.seed, h.dare, h.anonymous, h.created_at, h.sender,
  (SELECT display_name FROM accounts WHERE id = h.sender) AS sender_name,
  m.spec, m.name, m.title, m.flavour_text, m.language, m.signature`;
export const hauntRows = 'haunts h LEFT JOIN haunt_monsters m ON m.haunt_id = h.id';
/** Waiting, and sent recently enough to still be. Bound with the oldest sending that counts. */
export const stillWaiting = `h.state = 'waiting' AND h.created_at > ?`;
export const oldestWaiting = (now: Date) => isoAfter(now, -hauntLifeMs);

/** The haunts waiting for the caller, with the monster each one carries. */
export async function waitingHaunts(db: D1Database, recipientId: string, now: Date) {
  const { results } = await db
    .prepare(
      `SELECT ${hauntColumns} FROM ${hauntRows}
       WHERE h.recipient = ? AND ${stillWaiting} ORDER BY h.created_at`,
    )
    .bind(recipientId, oldestWaiting(now))
    .all<HauntRow>();
  return results.map(hauntView);
}

/**
 * How many haunts wait for the account this device is signed in to. One indexed read, and zero
 * for a device with no account, so a phone can ask every time it comes to the front.
 */
export async function countWaitingHaunts(
  db: D1Database,
  deviceHash: string,
  now: Date,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM haunts h JOIN account_devices d ON d.account_id = h.recipient
       WHERE d.device_hash = ? AND ${stillWaiting}`,
    )
    .bind(deviceHash, oldestWaiting(now))
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/**
 * A haunt as its page on the website shows it, by the id in the link: to its receiver, and to
 * its sender, who may see through the link whether it is still waiting and nothing more. No
 * account id and none of the monster's words. One that was caught or shooed, or has run out, is
 * `gone`, without saying which, and names nobody.
 */
export async function readHauntPage(
  db: D1Database,
  hauntId: string,
  now: Date,
): Promise<HauntPage | null> {
  const row = await db
    .prepare(
      `SELECT h.id, h.body_type, h.seed, h.dare, h.anonymous, h.created_at, h.state,
         (SELECT display_name FROM accounts WHERE id = h.sender) AS sender_name
       FROM haunts h WHERE h.id = ?`,
    )
    .bind(hauntId)
    .first<
      Pick<
        HauntRow,
        'id' | 'body_type' | 'seed' | 'dare' | 'anonymous' | 'created_at' | 'sender_name'
      > & { state: string }
    >();
  if (row === null) return null;
  const waiting = row.state === 'waiting' && row.created_at > oldestWaiting(now);
  return {
    id: row.id,
    bodyType: row.body_type as HauntPage['bodyType'],
    seed: row.seed,
    dare: row.dare,
    sentAt: row.created_at,
    from: waiting && row.anonymous === 0 ? { displayName: row.sender_name } : null,
    state: waiting ? 'waiting' : 'gone',
  };
}
