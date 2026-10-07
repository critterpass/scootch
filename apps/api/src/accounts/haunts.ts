import { monsterSpecSchema } from '../../../../packages/domain/src/contracts/art';

import type { HauntMonsterWords, SendHauntResponse } from '../contracts';
import type { Bindings } from '../env';
import { ApiError } from '../errors';
import { createFlagReader } from '../flags';
import { hauntPush } from '../push/push-lines';
import { pushToAccount } from '../push/push';
import { shareSigningSecret, wordsAreSigned } from '../sharing/signed-words';

import { accountById, type Account } from './accounts';
import { areFriends, isBlockedBetween } from './friends';
import {
  hauntColumns,
  hauntEveryMs,
  hauntLifeMs,
  hauntRows,
  hauntView,
  oldestWaiting,
  stillWaiting,
  type HauntRow,
} from './haunt-reads';
import { isoAfter, randomId, refusal } from './ids';

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

/**
 * `haunts.requireSignedWords`: on, a haunt is sent only with the words the server wrote for its
 * monster and the server's signature over them. The server writes a monster only for a task that
 * passed the care screen, so the signature is its own proof that the task was not a heavy one,
 * beside the verdict the phone reports.
 */
export const hauntFlags = createFlagReader({ 'haunts.requireSignedWords': true });

export type NewHaunt = {
  readonly to: string;
  readonly bodyType: string;
  readonly seed: string;
  readonly dare: HauntDare;
  readonly anonymous: boolean;
  readonly words?: HauntMonsterWords | undefined;
  readonly spec?: unknown;
};

const notForThis = () => refusal('not_for_this_task', 'This one stays with you');

/**
 * Checks the monster a haunt carries: its words must be the server's own for this seed, and its
 * drawing must be of this body and seed. Null when the haunt carries no words and need not.
 */
async function checkedMonster(env: Bindings, haunt: NewHaunt) {
  if (haunt.words === undefined) {
    if (await hauntFlags.isOn(env.DB, 'haunts.requireSignedWords')) throw notForThis();
    return null;
  }
  const { signature, ...words } = haunt.words;
  const signed = await wordsAreSigned(
    shareSigningSecret(env),
    { ...words, seed: haunt.seed },
    signature,
  );
  if (!signed) throw notForThis();
  const spec = haunt.spec === undefined ? null : monsterSpecSchema.safeParse(haunt.spec);
  if (spec?.success === false)
    throw new ApiError('bad_request', 'The body does not match the route');
  if (spec && (spec.data.bodyType !== haunt.bodyType || spec.data.seed !== haunt.seed)) {
    throw new ApiError('bad_request', 'The body does not match the route');
  }
  return { words: haunt.words, spec: spec?.data ?? null };
}

/**
 * Sends a friend a monster with a preset dare. Friends only, to someone who can be haunted, and
 * one per friend per seven days: the week is claimed in the same statement that stores the
 * haunt, and it counts from the sending whatever the friend did with it. The sender gets the id
 * of the haunt's page on the website, to pass on as a link, and no later word: the page says
 * only whether the monster is still waiting, to anyone who holds the link. The receiver's phone
 * gets one push when pushes are on.
 */
export async function sendHaunt(
  env: Bindings,
  sender: Account,
  haunt: NewHaunt,
  now: Date,
): Promise<SendHauntResponse> {
  const db = env.DB;
  if (haunt.to === sender.id) throw refusal('not_friends', 'You can only haunt a friend');
  const recipient = await accountById(db, haunt.to);
  const friends = recipient !== null && (await areFriends(db, sender.id, haunt.to));
  if (!recipient || !friends || (await isBlockedBetween(db, sender.id, haunt.to))) {
    throw refusal('not_friends', 'You can only haunt a friend');
  }
  if (!recipient.canBeHaunted)
    throw refusal('cannot_be_haunted', 'This friend is not taking haunts');
  const monster = await checkedMonster(env, haunt);

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
      isoAfter(now, -hauntEveryMs),
    )
    .first<{ id: string }>();
  if (stored === null) throw refusal('haunted_recently', 'One haunt per friend each week');
  await db.batch([
    // The monsters of haunts that have run out are forgotten as new ones arrive.
    db
      .prepare(
        `DELETE FROM haunt_monsters WHERE haunt_id IN (
           SELECT id FROM haunts WHERE state != 'waiting' OR created_at <= ?)`,
      )
      .bind(isoAfter(now, -hauntLifeMs)),
    ...(monster === null
      ? []
      : [
          db
            .prepare(
              `INSERT INTO haunt_monsters
                 (haunt_id, spec, name, title, flavour_text, language, signature)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              stored.id,
              monster.spec === null ? null : JSON.stringify(monster.spec),
              monster.words.name,
              monster.words.title,
              monster.words.flavourText,
              monster.words.language,
              monster.words.signature,
            ),
        ]),
  ]);
  await pushToAccount(
    env,
    haunt.to,
    hauntPush(haunt.anonymous ? null : sender.displayName, stored.id),
    now,
  );
  return { sent: true, pageId: stored.id };
}

/**
 * Catches or shoos a waiting haunt. Only its recipient can, and only once. Either way the row
 * stays, so the week between haunts runs on unchanged and the sender can tell nothing. The
 * answer carries the monster as it was sent, so a catch can keep it; the server then forgets the
 * monster's words.
 */
export async function resolveHaunt(
  db: D1Database,
  recipientId: string,
  hauntId: string,
  state: 'caught' | 'shooed',
  now: Date,
) {
  const row = await db
    .prepare(
      `SELECT ${hauntColumns} FROM ${hauntRows}
       WHERE h.id = ? AND h.recipient = ? AND ${stillWaiting}`,
    )
    .bind(hauntId, recipientId, oldestWaiting(now))
    .first<HauntRow>();
  const changed =
    row === null
      ? null
      : await db
          .prepare(`UPDATE haunts SET state = ? WHERE id = ? AND state = 'waiting' RETURNING id`)
          .bind(state, hauntId)
          .first();
  if (row === null || changed === null) throw new ApiError('not_found', 'No such haunt is waiting');
  await db.prepare('DELETE FROM haunt_monsters WHERE haunt_id = ?').bind(hauntId).run();
  return hauntView(row);
}

/**
 * Shoos a waiting haunt for whoever holds its link, leaving the same row the app's shoo leaves.
 * A haunt already caught or shooed is left as it is. False only when there is no such haunt.
 */
export async function shooHauntByLink(db: D1Database, hauntId: string): Promise<boolean> {
  const [, found] = await db.batch([
    db
      .prepare(`UPDATE haunts SET state = 'shooed' WHERE id = ? AND state = 'waiting'`)
      .bind(hauntId),
    db.prepare('SELECT 1 FROM haunts WHERE id = ?').bind(hauntId),
    db.prepare('DELETE FROM haunt_monsters WHERE haunt_id = ?').bind(hauntId),
  ]);
  return (found?.results.length ?? 0) > 0;
}
