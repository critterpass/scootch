import { addDays } from '@scootch/domain';

import { parkWhole } from './day-rollover';
import type { DayContext } from './day-types';

/**
 * A task that was started and then left is put in the drawer whole: its row, its monster and its
 * sittings stay, under the same id, and it can be swapped back in like anything parked. The start
 * it used today stays used, because its session keeps today's date. The task itself steps off
 * today, the way a task parked at a day's turn does.
 */
export async function parkStartedTask(ctx: DayContext): Promise<void> {
  const { today, localDate } = ctx.memory.state;
  if (today.kind !== 'task_set' || today.task.status !== 'started') return;
  await parkWhole(ctx, [today.task], localDate);
  await ctx.deps.repositories.tasks.put({ ...today.task, localDate: addDays(localDate, -1) });
  ctx.set({ pick: { kind: 'none' }, session: null, line: null });
  await ctx.refresh();
}

/**
 * "Fix the words", on the offered one thing: nothing is set, and everything the person said is
 * back in the composer to change and send. What was already parked from those words stays parked;
 * saying a thing a second time does not park it twice.
 */
export async function returnOneThing(ctx: DayContext): Promise<void> {
  const { today, pick } = ctx.memory.state;
  if (pick.kind !== 'offered' || !('task' in today) || today.task.status !== 'set') return;
  const { transcripts, unsortedWords, forgetTask } = ctx.deps.repositories;
  const { task } = today;
  const kept = await unsortedWords.for(task.id);
  const text = ctx.memory.offer?.text ?? kept?.text ?? task.originalText;
  for (let one = await transcripts.pending(); one; one = await transcripts.pending()) {
    await transcripts.remove(one.id);
  }
  await unsortedWords.remove(task.id);
  await forgetTask(task.id);
  ctx.memory.offer = null;
  ctx.memory.restPending = false;
  ctx.set({
    pick: { kind: 'none' },
    heardDeadlines: [],
    line: null,
    modelDown: false,
    returnedText: text,
  });
  await ctx.refresh();
}
