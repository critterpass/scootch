import {
  checkInAt,
  instantFromIso,
  isoFromInstant,
  sessionReducer,
  sessionSet,
  type IsoDate,
  type LiveSession,
  type ParkedThought,
  type SessionRow,
  type TaskRow,
} from '@scootch/domain';

import type { DayContext } from './day-types';
import { toneFor } from './lines';
import { keepUnansweredThoughts } from './parked-thoughts';
import { contextFor } from './session-flow';

/**
 * The day a stored session is still running on: the latest opened day, when one of its tasks has
 * an open session whose planned end is still ahead and that was not answered "not finished".
 * `null` when there is none, and then the clock says what day it is.
 */
export async function dayOfRunningSession(
  ctx: Pick<DayContext, 'deps' | 'now'>,
  latestDay: IsoDate | null,
): Promise<IsoDate | null> {
  if (latestDay === null) return null;
  const { sessions, tasks, days } = ctx.deps.repositories;
  if ((await days.get(latestDay))?.status === 'crisis') return null;
  for (const task of await tasks.where('localDate', latestDay)) {
    if (task.status === 'finished') continue;
    const running = (await sessions.where('taskId', task.id)).some(
      (row) => row.endedAt === null && instantFromIso(row.endsAt) > ctx.now(),
    );
    if (running) return latestDay;
  }
  return null;
}

/**
 * A task has at most one open session, and a finished or forgotten task has none. Rows an earlier
 * version of the app left open beside the real one are closed here, before today is read: the
 * newest open row of an unfinished task is the session, and each older one ended when the next
 * began. Nothing is deleted, so the time worked in them still counts.
 */
export async function closeStraySessions(ctx: Pick<DayContext, 'deps' | 'now'>): Promise<void> {
  const { sessions, tasks } = ctx.deps.repositories;
  const open = new Map<string, SessionRow[]>();
  for (const row of await sessions.all()) {
    if (row.endedAt === null) open.set(row.taskId, [...(open.get(row.taskId) ?? []), row]);
  }
  for (const [taskId, rows] of open) {
    const task = await tasks.get(taskId);
    const live = task !== null && task.status !== 'finished';
    if (live && rows.length === 1) continue;
    const ordered = [...rows].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const stray = live ? ordered.slice(0, -1) : ordered;
    for (const [index, row] of stray.entries()) {
      // It ended when the next one began, when its task was finished, or when its time was up.
      const until = ordered[index + 1]?.startedAt ?? task?.finishedAt ?? isoFromInstant(ctx.now());
      const endedAt = [row.endsAt, until].sort()[0] ?? row.endsAt;
      await sessions.put({
        ...row,
        endedAt: endedAt < row.startedAt ? row.startedAt : endedAt,
        outcome: row.outcome ?? 'left_early',
      });
    }
  }
}

/**
 * The running session as it is stored, brought back after the app was killed: the timer is the
 * stored end time, and the relaunch re-arms the timers without starting or granting anything.
 */
export async function restoreSession(ctx: DayContext, tasks: readonly TaskRow[]): Promise<void> {
  const { repositories } = ctx.deps;
  // What sessions that are over left unanswered (the app was closed first, or the day turned).
  await keepUnansweredThoughts(ctx);
  for (const task of tasks) {
    const row = (await repositories.sessions.where('taskId', task.id)).find(
      (one) => one.endedAt === null,
    );
    if (!row) continue;
    const thoughts: ParkedThought[] = (await repositories.parkedThoughts.where('sessionId', row.id))
      .map((one) => ({ text: one.text, parkedAt: instantFromIso(one.parkedAt) }))
      .sort((a, b) => a.parkedAt - b.parkedAt);
    const startedAt = instantFromIso(row.startedAt);
    const endsAt = instantFromIso(row.endsAt);
    const base: LiveSession = {
      ...sessionSet({
        taskId: task.id,
        tone: toneFor(task),
        minutes: row.plannedMinutes,
        shrinkCount: task.shrinkCount,
        treat: row.treat,
        nextStart: task.nextStart ?? null,
      }),
      startedAt,
      endsAt,
      thoughts,
    };
    ctx.memory.sessionRowId = row.id;
    if (row.outcome === 'not_finished') {
      // The three choices are still waiting. The tap's own moment is not stored, and it may have
      // come before time was up: never later than now.
      const endedAt = Math.min(endsAt, ctx.now());
      ctx.set({
        session: { ...base, phase: 'not_finished', endedAt, warned: true, checkedIn: true },
      });
      ctx.deps.runner.run([{ kind: 'show_line', line: 'notFinished' }], contextFor(ctx, task));
      return;
    }
    // A check-in whose moment has passed was offered while the app was open, or belongs to a
    // stretch nobody was looking at: either way it is not offered now. "I'm stuck" is still there.
    const checkAt = checkInAt({ ...base, phase: 'running' });
    const stored: LiveSession = {
      ...base,
      phase: 'running',
      inForeground: false,
      checkedIn: checkAt !== null && ctx.now() >= checkAt,
    };
    const step = sessionReducer(stored, { type: 'relaunched' }, ctx.now());
    ctx.set({ session: step.state });
    ctx.deps.runner.run(step.effects, contextFor(ctx, task));
    return;
  }
}
