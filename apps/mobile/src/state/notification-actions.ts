import { addDays, type Id } from '@scootch/domain';

import { biteTicked } from './bites';
import type { DayContext } from './day-types';
import { carryToTomorrow } from './rest-flow';
import { applySurfaceAction } from './surface-actions';

/** How long "Turn it down for a week" lasts, counting today. */
export const TURNED_DOWN_DAYS = 7;

/** Today's one thing when it is the thing asked about and no session has begun on it. */
function waitingToday(ctx: DayContext, taskId: Id) {
  const { today } = ctx.memory.state;
  return today.kind === 'task_set' && today.task.id === taskId ? today.task : null;
}

/**
 * A bite was ticked under a notification. The tick is kept and the monster is smaller. When it
 * was the last of the three, the thing is done but for the catch, and the catch is the app's: the
 * session begins, and on its screen "I'm done" is where Scootch asks whether it really is.
 */
export async function biteTickedOutside(ctx: DayContext, taskId: Id, place: number): Promise<void> {
  if (ctx.memory.state.today.kind === 'crisis') return;
  const last = await biteTicked(ctx, taskId, place);
  if (last && waitingToday(ctx, taskId)) await applySurfaceAction(ctx, 'start_session');
}

/**
 * "Tomorrow at 9:00": the thing waits for tomorrow and today rests. Only for today's own thing,
 * before a session has begun on it; anything else is left as it is.
 */
export async function huntTomorrow(ctx: DayContext, taskId: Id): Promise<void> {
  const task = waitingToday(ctx, taskId);
  if (!task) return;
  await carryToTomorrow(ctx, task);
  await ctx.refresh();
}

/** "Turn it down for a week": the thing's monster is quiet-voiced until the seventh day. */
export async function turnDown(ctx: DayContext, taskId: Id): Promise<void> {
  const { tasks } = ctx.deps.repositories;
  const task = await tasks.get(taskId);
  if (task === null || task.status === 'finished') return;
  const softUntil = addDays(ctx.memory.state.localDate, TURNED_DOWN_DAYS - 1);
  await tasks.put({ ...task, softUntil });
  await ctx.refresh();
}
