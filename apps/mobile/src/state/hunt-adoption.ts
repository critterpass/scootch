import {
  MINUTE_MS,
  isoFromInstant,
  startRefused,
  type HuntRecord,
  type SessionRow,
} from '@scootch/domain';

import type { DayContext } from './day-types';
import { currentTask } from './session-flow';
import { followTableClock } from './session-moments';
import { restoreSession } from './session-restore';

const TIMED: readonly string[] = ['running', 'stuck', 'holding'];
/** As long as the wheel goes. */
const MAX_MINUTES = 180;

/** When the hunt's time is up as the app counts it: a clock held outside runs again from now. */
function endOf(record: HuntRecord, now: number): number {
  return record.pausedAt === null
    ? record.endsAt
    : record.endsAt + Math.max(0, now - record.pausedAt);
}

/**
 * Takes up a hunt that was moved while the app was away. Nothing here can do more than the
 * screens can: a crisis day ignores it, it is only ever about today's one thing, a start goes
 * through the day's limit, and a hunt that is over is left to its own ending.
 *
 * - A session already running here follows the record's clock (a clock held and released on the
 *   Lock Screen), and one whose time was called runs again after "5 more".
 * - A hunt begun outside becomes the session: its stored row starts when the clock started, and
 *   it is brought up as a relaunch brings one up, so nothing is started or granted twice.
 */
export async function adoptHunt(ctx: DayContext, record: HuntRecord): Promise<void> {
  const { today, session } = ctx.memory.state;
  if (today.kind === 'crisis') return;
  if (record.caughtAt !== null || record.stoppedAt !== null) return;
  const task = currentTask(ctx);
  if (!task || task.id !== record.taskId || task.status === 'finished') return;
  const now = ctx.now();
  // Still counting in: "Not yet" may yet take it back.
  if (now < record.beginsAt) return;

  if (session && TIMED.includes(session.phase)) {
    return followTableClock(ctx, endOf(record, now));
  }
  const { sessions, tasks } = ctx.deps.repositories;
  if (session?.phase === 'time_up') {
    // "5 more" was asked for on the Lock Screen after time was called here: the clock runs again.
    const rowId = ctx.memory.sessionRowId;
    const row = rowId === null ? null : await sessions.get(rowId);
    const until = endOf(record, now);
    if (!row || row.endedAt !== null || until <= now) return;
    await sessions.put({ ...row, endsAt: isoFromInstant(until) });
    await restoreSession(ctx, [task]);
    return ctx.refresh();
  }
  if (session && session.phase !== 'set') return;
  if (startRefused(today)) return;

  const open = (await sessions.where('taskId', task.id)).some((row) => row.endedAt === null);
  if (!open) {
    const minutes = Math.round((record.endsAt - record.beginsAt) / MINUTE_MS);
    const row: SessionRow = {
      id: ctx.deps.nextId(),
      taskId: task.id,
      localDate: task.localDate,
      plannedMinutes: Math.min(MAX_MINUTES, Math.max(1, minutes)),
      treat: null,
      startedAt: isoFromInstant(record.beginsAt),
      endsAt: isoFromInstant(endOf(record, now)),
      endedAt: null,
      outcome: null,
      finishMethod: null,
      notFinishedChoice: null,
      tableId: null,
    };
    await sessions.put(row);
  }
  const started = { ...task, status: 'started' as const };
  await tasks.put(started);
  await restoreSession(ctx, [started]);
  await ctx.refresh();
}
