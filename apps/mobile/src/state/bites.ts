import { bittenScale, tickBite, type Bite, type MonsterRow, type TaskRow } from '@scootch/domain';

import type { DayContext } from './day-types';
import { showsComedy } from './shows-comedy';

/**
 * A task's three bites. None for a task with no lines yet, for one whose pack has none, and for
 * a serious task, with or without "it's fine, be funny": bites come out of a monster.
 */
export function bitesOf(task: TaskRow): readonly Bite[] {
  const { lines } = task;
  if (lines === null || !('hatch' in lines) || !showsComedy(task, 'monster')) return [];
  return lines.bites ?? [];
}

export interface Bitten {
  readonly task: TaskRow;
  readonly monster: MonsterRow | null;
  /** True when the last bite went: the catch is next, and it happens in the app. */
  readonly last: boolean;
}

/**
 * The task and its monster after the bite at `place` is ticked: the tick is kept with the task
 * and the monster is a third smaller. `null` when there is nothing to tick. Nothing is earned.
 */
export function bitten(task: TaskRow, monster: MonsterRow | null, place: number): Bitten | null {
  if (task.status === 'finished' || place >= bitesOf(task).length) return null;
  const before = task.bitesCaught ?? [];
  const tick = tickBite(before, place);
  if (tick === null) return null;
  const ratio = bittenScale(tick.caught.length) / bittenScale(before.length);
  // A size never goes up, and never under the smallest a monster is drawn at.
  const size = monster && Math.min(monster.spec.size, Math.max(0.25, monster.spec.size * ratio));
  return {
    task: { ...task, bitesCaught: tick.caught },
    monster: monster && size !== null ? { ...monster, spec: { ...monster.spec, size } } : null,
    last: tick.last,
  };
}

/**
 * A bite was ticked, in a notification or in the app. Answers whether it was the last one, so
 * the caller can open the catch; `false` too when there was nothing to tick.
 */
export async function biteTicked(ctx: DayContext, taskId: string, place: number): Promise<boolean> {
  const { tasks, monsters } = ctx.deps.repositories;
  const task = await tasks.get(taskId);
  if (task === null) return false;
  const monster = (await monsters.where('taskId', task.id))[0] ?? null;
  const after = bitten(task, monster && monster.caughtAt === null ? monster : null, place);
  if (after === null) return false;
  await tasks.put(after.task);
  if (after.monster) await monsters.put(after.monster);
  return after.last;
}
