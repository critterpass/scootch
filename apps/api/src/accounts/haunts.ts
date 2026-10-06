import { ApiError } from '../errors';

import { accountById, type Account } from './accounts';
import { areFriends, isBlockedBetween } from './friends';
import { randomId, refusal } from './ids';

/**
 * The dares a haunting monster can carry. A fixed list of ids: the words for each live with the
 * app's other copy, and a haunt can carry no words of the sender's own.
 */
export const hauntDares = [
  'two_minutes',
  'first_step',
  'before_lunch',
  'just_open_it',
  'race_you',
  'tiny_bit',
] as const;
export type HauntDare = (typeof hauntDares)[number];

/** A monster seed as a haunt carries it: hexadecimal or a UUID, never words. */
export const hauntSeedPattern = /^[0-9a-f-]{8,64}$/;

/** One haunt per friend in this long. */
export const hauntEveryMs = 7 * 24 * 60 * 60 * 1000;

export type NewHaunt = {
  readonly to: string;
  readonly bodyType: string;
  readonly seed: string;
  readonly dare: HauntDare;
  readonly anonymous: boolean;
};

/**
 * Sends a friend a monster with a preset dare. Friends only, to someone who can be haunted, and
 * one per friend per seven days: the week is claimed in the same statement that stores the
 * haunt, and it counts from the sending whatever the friend did with it. The sender gets no id
 * and no later word: nothing the API offers them changes when the haunt is caught or shooed.
 */
export async function sendHaunt(
  db: D1Database,
  sender: Account,
  haunt: NewHaunt,
  now: Date,
): Promise<void> {
  if (haunt.to === sender.id) throw refusal('not_friends', 'You can only haunt a friend');
  const recipient = await accountById(db, haunt.to);
  const friends = recipient !== null && (await areFriends(db, sender.id, haunt.to));
  if (!recipient || !friends || (await isBlockedBetween(db, sender.id, haunt.to))) {
    throw refusal('not_friends', 'You can only haunt a friend');
  }
  if (!recipient.canBeHaunted)
    throw refusal('cannot_be_haunted', 'This friend is not taking haunts');

  const stored = await db
    .prepare(
      `INSERT INTO haunts (id, sender, recipient, body_type, seed, dare, anonymous, created_at)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
       WHERE NOT EXISTS (
         SELECT 1 FROM haunts WHERE sender = ?2 AND recipient = ?3 AND created_at > ?9)
       RETURNING id`,
    )
    .bind(
      randomId(16),
      sender.id,
      haunt.to,
      haunt.bodyType,
      haunt.seed,
      haunt.dare,
      haunt.anonymous ? 1 : 0,
      now.toISOString(),
      new Date(now.getTime() - hauntEveryMs).toISOString(),
    )
    .first();
  if (stored === null) throw refusal('haunted_recently', 'One haunt per friend each week');
}

type HauntRow = {
  id: string;
  body_type: string;
  seed: string;
  dare: string;
  anonymous: number;
  created_at: string;
  sender: string;
  sender_name: string | null;
};

function hauntView(row: HauntRow) {
  return {
    id: row.id,
    bodyType: row.body_type,
    seed: row.seed,
    dare: row.dare,
    sentAt: row.created_at,
    // An anonymous haunt names nobody, to the phone as well as on the screen.
    from: row.anonymous === 1 ? null : { accountId: row.sender, displayName: row.sender_name },
  };
}

const hauntColumns = `h.id, h.body_type, h.seed, h.dare, h.anonymous, h.created_at, h.sender,
  (SELECT display_name FROM accounts WHERE id = h.sender) AS sender_name`;

/** The haunts waiting for the caller. The phone asks when it opens; nothing is pushed. */
export async function waitingHaunts(db: D1Database, recipientId: string) {
  const { results } = await db
    .prepare(
      `SELECT ${hauntColumns} FROM haunts h
       WHERE h.recipient = ? AND h.state = 'waiting' ORDER BY h.created_at`,
    )
    .bind(recipientId)
    .all<HauntRow>();
  return results.map(hauntView);
}

/**
 * Catches or shoos a waiting haunt. Only its recipient can, and only once. Either way the row
 * stays, so the week between haunts runs on unchanged and the sender can tell nothing.
 */
export async function resolveHaunt(
  db: D1Database,
  recipientId: string,
  hauntId: string,
  state: 'caught' | 'shooed',
) {
  const changed = await db
    .prepare(
      `UPDATE haunts SET state = ? WHERE id = ? AND recipient = ? AND state = 'waiting'
       RETURNING id`,
    )
    .bind(state, hauntId, recipientId)
    .first();
  const row =
    changed === null
      ? null
      : await db
          .prepare(`SELECT ${hauntColumns} FROM haunts h WHERE h.id = ?`)
          .bind(hauntId)
          .first<HauntRow>();
  if (row === null) throw new ApiError('not_found', 'No such haunt is waiting');
  return hauntView(row);
}
