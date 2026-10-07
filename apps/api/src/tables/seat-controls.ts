import { accountById, type Account } from '../accounts/accounts';
import { removeFriend } from '../accounts/friends';
import { refusal } from '../accounts/ids';
import { sendMessage, type BotContext } from '../bot/telegram';
import type { Bindings } from '../env';
import { ApiError } from '../errors';

import { reportActions } from './moderation';
import { tablesOf } from './table-rows';
import { tableStub } from './tables';

/** Why a seat can be reported. A fixed list: a report carries no words from the reporter. */
export const reportReasons = [
  'offensive_name',
  'nudge_spam',
  'feels_unsafe',
  'something_else',
] as const;
export type ReportReason = (typeof reportReasons)[number];

const reasonText: Record<ReportReason, string> = {
  offensive_name: 'offensive name',
  nudge_spam: 'nudge spam',
  feels_unsafe: 'feels unsafe',
  something_else: 'something else',
};

/** Reports one account may make in a day. */
export const reportsPerDay = 5;
const dayMs = 24 * 60 * 60 * 1000;

function notSelf(account: Account, otherId: string): void {
  if (account.id === otherId) throw refusal('not_yourself', 'That is your own seat');
}

/** Mutes or unmutes nudges from one person. Stored per pair; the muted person is never told. */
export async function setMuted(
  db: D1Database,
  account: Account,
  otherId: string,
  muted: boolean,
): Promise<void> {
  notSelf(account, otherId);
  if (!muted) {
    await db
      .prepare('DELETE FROM mutes WHERE muter = ? AND muted = ?')
      .bind(account.id, otherId)
      .run();
    return;
  }
  if ((await accountById(db, otherId)) === null) return;
  await db
    .prepare('INSERT INTO mutes (muter, muted) VALUES (?, ?) ON CONFLICT DO NOTHING')
    .bind(account.id, otherId)
    .run();
}

/**
 * Blocks or unblocks a person. Blocked, the two can no longer share a table, be friends or haunt
 * each other. If they are at a table together now, the one who blocked leaves it, so the other
 * sees only that a seat emptied.
 */
export async function setBlocked(
  env: Bindings,
  account: Account,
  otherId: string,
  blocked: boolean,
): Promise<void> {
  notSelf(account, otherId);
  const db = env.DB;
  if (!blocked) {
    await db
      .prepare('DELETE FROM blocks WHERE blocker = ? AND blocked = ?')
      .bind(account.id, otherId)
      .run();
    return;
  }
  if ((await accountById(db, otherId)) === null) return;
  await db
    .prepare('INSERT INTO blocks (blocker, blocked) VALUES (?, ?) ON CONFLICT DO NOTHING')
    .bind(account.id, otherId)
    .run();
  await removeFriend(db, account.id, otherId);
  const theirs = new Set(await tablesOf(db, otherId));
  for (const tableId of await tablesOf(db, account.id)) {
    if (theirs.has(tableId)) await tableStub(env, tableId).remove(account.id);
  }
}

export type Report = {
  readonly tableId: string;
  readonly accountId: string;
  readonly reason: ReportReason;
  readonly alsoLeave: boolean;
};

/**
 * Reports a person seated at the same table. The report is stored, then posted once to the
 * founder's chat with ids, the display name, the reason and a nudge count, and three buttons.
 * A second report of the same person at the same table changes nothing and posts nothing.
 */
export async function reportSeat(
  context: BotContext,
  reporter: Account,
  report: Report,
): Promise<void> {
  notSelf(reporter, report.accountId);
  const { env, now } = context;
  const table = tableStub(env, report.tableId);
  const seats = (await table.stored())?.seats;
  const reported = seats?.find((seat) => seat.accountId === report.accountId);
  if (!reported || !seats?.some((seat) => seat.accountId === reporter.id)) {
    throw refusal('not_at_table', 'You are not at a table with this person');
  }

  const repeat = await env.DB.prepare(
    'SELECT 1 FROM reports WHERE reporter = ? AND reported = ? AND table_id = ?',
  )
    .bind(reporter.id, report.accountId, report.tableId)
    .first();
  if (repeat === null) {
    const recent = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM reports WHERE reporter = ? AND created_at > ?',
    )
      .bind(reporter.id, new Date(now.getTime() - dayMs).toISOString())
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= reportsPerDay) {
      throw new ApiError('rate_limited', 'Too many reports today');
    }
    const stored = await env.DB.prepare(
      `INSERT INTO reports (reporter, reported, table_id, reason, nudge_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    )
      .bind(
        reporter.id,
        report.accountId,
        report.tableId,
        report.reason,
        reported.nudgesSent,
        now.toISOString(),
      )
      .first<{ id: number }>();
    const name = (await accountById(env.DB, report.accountId))?.displayName ?? '(no name)';
    if (stored !== null) {
      await sendMessage(
        context,
        [
          `Table report ${stored.id}: ${reasonText[report.reason]}`,
          `Reported: ${report.accountId} "${name}"`,
          `Reporter: ${reporter.id}`,
          `Nudges sent by reported: ${reported.nudgesSent}`,
        ].join('\n'),
        {
          buttons: [
            reportActions.map((action) => ({
              text: action[0]?.toUpperCase() + action.slice(1),
              data: `report:${stored.id}:${action}`,
            })),
          ],
        },
      );
    }
  }
  if (report.alsoLeave) await table.remove(reporter.id);
}

export type Quieted = { accountId: string; displayName: string | null };

/**
 * The people the caller has muted, and the people the caller has blocked, so either can be
 * undone. Only the caller's own choices: who has muted or blocked them is never given out.
 */
export async function quietedBy(
  db: D1Database,
  accountId: string,
): Promise<{ muted: Quieted[]; blocked: Quieted[] }> {
  const list = async (table: 'mutes' | 'blocks', mine: string, theirs: string) => {
    const { results } = await db
      .prepare(
        `SELECT a.id, a.display_name FROM ${table} q JOIN accounts a ON a.id = q.${theirs}
         WHERE q.${mine} = ? ORDER BY a.display_name, a.id`,
      )
      .bind(accountId)
      .all<{ id: string; display_name: string | null }>();
    return results.map((row) => ({ accountId: row.id, displayName: row.display_name }));
  };
  return {
    muted: await list('mutes', 'muter', 'muted'),
    blocked: await list('blocks', 'blocker', 'blocked'),
  };
}
