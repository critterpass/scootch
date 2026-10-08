import { oddHatchFor, type MonsterRow, type TaskRow } from '@scootch/domain';

import type { DayContext } from './day-types';

/**
 * A monster about to be written at its hatch, as an odd week leaves it: with the word of the odd
 * hatch when this is the week and the turn for one, and otherwise exactly as it came. Only a task
 * screened as an ordinary one is ever varied.
 */
export async function hatchedInThisWeek(
  ctx: DayContext,
  task: TaskRow,
  monster: MonsterRow,
): Promise<MonsterRow> {
  const odd = oddHatchFor({
    taskId: task.id,
    serious: task.screen !== 'pass',
    today: ctx.memory.state.localDate,
    timeZone: ctx.deps.timeZone(),
    monsters: await ctx.deps.repositories.monsters.all(),
  });
  return odd ? { ...monster, oddWord: odd.word } : monster;
}
