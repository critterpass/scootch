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

/**
 * "That's it for today": the day rests without a finish. A task that is set, or was started and
 * left, waits for tomorrow; nothing is dropped. A serious task has its own "Not today". What was
 * moved is noted, so the same day it can be taken back.
 */
export async function restForToday(ctx: DayContext): Promise<void> {
  const { today, localDate } = ctx.memory.state;
  const { days, dayNotes } = ctx.deps.repositories;
  const notes = await dayNotes.read(localDate);
  if (today.kind === 'task_set') {
    const { id, carriedOver } = today.task;
    await carryToTomorrow(ctx, today.task);
    await dayNotes.write({ ...notes, rested: { taskId: id, carriedOver } });
    ctx.set({ pick: { kind: 'none' }, session: null, line: null });
  } else if (today.kind === 'nothing_yet') {
    const day = await days.get(localDate);
    if (day && day.status === 'open') {
      await days.put({ ...day, status: 'done' });
      await dayNotes.write({ ...notes, rested: { taskId: null, carriedOver: false } });
    }
  }
  await ctx.refresh();
}

/** Whether "That's it for today" can still be taken back: same day, and what it moved is unmoved. */
export async function restCanBeUndone(ctx: Pick<DayContext, 'deps' | 'memory'>): Promise<boolean> {
  const { localDate } = ctx.memory.state;
  const { days, tasks, dayNotes } = ctx.deps.repositories;
  const { rested } = await dayNotes.read(localDate);
  if (rested === null || (await days.get(localDate))?.status !== 'done') return false;
  if ((await tasks.where('localDate', localDate)).length > 0) return false;
  if (rested.taskId === null) return true;
  const task = await tasks.get(rested.taskId);
  return task !== null && task.status === 'set' && task.localDate === addDays(localDate, 1);
}

/** "Changed my mind": the day is open again and its one thing is back on it, as it was. */
export async function undoRest(ctx: DayContext): Promise<void> {
  if (!(await restCanBeUndone(ctx))) return;
  const { localDate } = ctx.memory.state;
  const { days, tasks, dayNotes } = ctx.deps.repositories;
  const notes = await dayNotes.read(localDate);
  const task = notes.rested?.taskId ? await tasks.get(notes.rested.taskId) : null;
  if (task)
    await tasks.put({ ...task, localDate, carriedOver: notes.rested?.carriedOver ?? false });
  const day = await days.get(localDate);
  if (day) await days.put({ ...day, status: 'open' });
  await dayNotes.write({ ...notes, rested: null });
  ctx.set({ oneMore: false, line: null });
  await ctx.refresh();
}
