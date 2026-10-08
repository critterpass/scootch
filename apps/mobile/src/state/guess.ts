import type { GuessMinutes } from '@scootch/domain';

import type { DayContext } from './day-types';

/**
 * The person's guess at how long today's thing would take, made before any session on it. It is
 * kept with the task and changes nothing else: no length, no line, no start. A serious task takes
 * no guess, and neither does a day with no task set; a later guess replaces the earlier one.
 */
export async function guessMade(ctx: DayContext, minutes: GuessMinutes): Promise<void> {
  const { today } = ctx.memory.state;
  if (today.kind !== 'task_set' || today.task.screen === 'serious') return;
  await ctx.deps.repositories.tasks.put({ ...today.task, guessMinutes: minutes });
  await ctx.refresh();
}
