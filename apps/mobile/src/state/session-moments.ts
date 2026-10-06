import { isoFromInstant, type LiveSession } from '@scootch/domain';

import type { DayContext } from './day-types';
import { NO_AFTER_LINES, lineFor } from './lines';
import { contextFor, currentTask } from './session-flow';

const TIMED: readonly string[] = ['running', 'stuck', 'holding'];
const OVER: readonly string[] = [
  'finished',
  'left_early',
  'carried_over',
  'made_smaller',
  'let_go',
];

/** Scootch says the next of the task's working lines. Nothing changes outside a running session. */
export function turnWorkingLine(ctx: DayContext): void {
  const { session, settings } = ctx.memory.state;
  const task = currentTask(ctx);
  if (!task || !session || session.phase !== 'running') return;
  ctx.memory.workingTurn += 1;
  const text = lineFor('working', task, settings, ctx.memory.workingTurn);
  if (text !== null) ctx.set({ line: { slot: 'working', text } });
}

/**
 * The screens have shown everything an ended session handed over. The session and what the runner
 * showed for it are cleared, so nothing of it is shown beside the next one. A session that is
 * still going is left alone.
 */
export function closeSession(ctx: DayContext): void {
  const { session } = ctx.memory.state;
  if (session && !OVER.includes(session.phase)) return;
  ctx.set({
    session: null,
    line: null,
    burst: null,
    treat: null,
    parkedThoughts: [],
    afterLines: NO_AFTER_LINES,
  });
}

/**
 * Developer tools only: moves the end of the running session to a few seconds from now, in the
 * stored row and in the timers, so a device flow does not wait ten minutes for time to be up.
 */
export async function shortenSession(ctx: DayContext, seconds: number): Promise<void> {
  const { session } = ctx.memory.state;
  const task = currentTask(ctx);
  const rowId = ctx.memory.sessionRowId;
  if (!task || !session || !TIMED.includes(session.phase) || rowId === null) return;
  const live = session as LiveSession;
  const endsAt = ctx.now() + Math.max(1, seconds) * 1000;
  if (live.endsAt === null || endsAt >= live.endsAt) return;

  const { sessions } = ctx.deps.repositories;
  const row = await sessions.get(rowId);
  if (row) await sessions.put({ ...row, endsAt: isoFromInstant(endsAt) });
  ctx.set({ session: { ...live, endsAt, warned: true, checkedIn: true } });
  ctx.deps.runner.run(
    [{ kind: 'cancel_timer' }, { kind: 'start_timer', until: endsAt }],
    contextFor(ctx, task),
  );
}
