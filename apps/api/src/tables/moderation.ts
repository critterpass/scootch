import { accountIdPattern } from '../accounts/ids';
import type { Bindings } from '../env';

import { tablesOf } from './table-rows';
import { tableStub } from './tables';

export const reportActions = ['dismiss', 'warn', 'ban'] as const;
export type ReportAction = (typeof reportActions)[number];

const outcomeOf = { dismiss: 'dismissed', warn: 'warned', ban: 'banned' } as const;

/** A banned account cannot open or join a table. Its seats are given up at once. */
export async function banAccount(env: Bindings, accountId: string, now: Date): Promise<boolean> {
  const banned = await env.DB.prepare(
    'UPDATE accounts SET banned_at = COALESCE(banned_at, ?) WHERE id = ? RETURNING id',
  )
    .bind(now.toISOString(), accountId)
    .first();
  if (banned === null) return false;
  await env.DB.prepare('DELETE FROM table_invites WHERE created_by = ?').bind(accountId).run();
  for (const tableId of await tablesOf(env.DB, accountId)) {
    await tableStub(env, tableId).remove(accountId);
  }
  return true;
}

export async function unbanAccount(db: D1Database, accountId: string): Promise<boolean> {
  const row = await db
    .prepare('UPDATE accounts SET banned_at = NULL WHERE id = ? RETURNING id')
    .bind(accountId)
    .first();
  return row !== null;
}

/** The account id a bot command was given, or undefined when it is not one. */
export function accountIdArgument(arg: string | undefined): string | undefined {
  return arg !== undefined && accountIdPattern.test(arg) ? arg : undefined;
}

/**
 * Acts on a report, once: the first tap decides and later taps are told what was decided. The
 * answer is for the founder's chat. The reported person is never told who reported them; a
 * warning shows on their own account as a plain flag.
 */
export async function actOnReport(
  env: Bindings,
  reportId: number,
  action: ReportAction,
  now: Date,
): Promise<string> {
  const outcome = outcomeOf[action];
  const decided = await env.DB.prepare(
    'UPDATE reports SET outcome = ? WHERE id = ? AND outcome IS NULL RETURNING reported',
  )
    .bind(outcome, reportId)
    .first<{ reported: string }>();
  if (decided === null) {
    const existing = await env.DB.prepare('SELECT outcome FROM reports WHERE id = ?')
      .bind(reportId)
      .first<{ outcome: string | null }>();
    return existing === null
      ? `Report ${reportId} was not found.`
      : `Report ${reportId} was already ${existing.outcome}.`;
  }
  if (action === 'warn') {
    await env.DB.prepare('UPDATE accounts SET warned_at = ? WHERE id = ?')
      .bind(now.toISOString(), decided.reported)
      .run();
  }
  if (action === 'ban') await banAccount(env, decided.reported, now);
  return `Report ${reportId}: ${outcome} (${decided.reported}).`;
}
