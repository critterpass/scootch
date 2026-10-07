import { addDays, type TaskRow } from '@scootch/domain';

import type { DayContext } from './day-types';

/**
 * The task waits for tomorrow and today rests. The start it used today stays counted: its
 * session keeps today's date.
 */
export async function carryToTomorrow(ctx: DayContext, task: TaskRow): Promise<void> {
  const { tasks, days } = ctx.deps.repositories;
  const { localDate } = ctx.memory.state;
  await tasks.put({ ...task, localDate: addDays(localDate, 1), carriedOver: true, status: 'set' });
  const day = await days.get(localDate);
  if (day && day.status === 'open') await days.put({ ...day, status: 'done' });
}
