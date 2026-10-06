import { SMALLEST_ASK_MINUTES, type Ask, type MonsterRow, type TaskRow } from '@scootch/domain';

import type { DayContext } from './day-types';
import { nextSteps } from './lines';

/** Every length a session can be asked for, longest first. A counter-offer steps down this list. */
export const ASK_MINUTES = [50, 25, 10, 5, SMALLEST_ASK_MINUTES] as const;

/** How big a monster is drawn after each "too big", as the art's contact sheet shows them. */
export const MONSTER_SIZE_STEPS = [1, 0.78, 0.62, 0.46] as const;
export const MAX_SHRINKS = MONSTER_SIZE_STEPS.length - 1;

/** The scale for a number of shrinks. Past the last step a monster stays as small as it got. */
export function sizeStep(shrinkCount: number): number {
  const step = Math.min(Math.max(0, Math.trunc(shrinkCount)), MAX_SHRINKS);
  return MONSTER_SIZE_STEPS[step] ?? 1;
}

/**
 * The next ask down: the longest length shorter than the one asked now, or the same ask once it
 * is the smallest there is. Nothing here can return more minutes than it was given.
 */
export function smallerAsk(ask: Ask): Ask {
  const minutes = ASK_MINUTES.find((option) => option < ask.minutes);
  if (minutes === undefined) return ask;
  return { minutes, shrinkCount: ask.shrinkCount + 1 };
}

/** The ask after the person chose a length themselves while one was on the table: never longer. */
export function cappedMinutes(ask: Ask | null, chosen: number): number {
  return ask === null ? chosen : Math.min(ask.minutes, chosen);
}

/**
 * The words of a task one step smaller: the next of its own tiny next steps, each used once. With
 * none left it keeps the words it has: never a step it already took, never its longer wording.
 */
export function smallerText(task: TaskRow): string {
  return nextSteps(task.lines)[task.shrinkCount] ?? task.text;
}

/** A monster one size step down from where its task's shrinks put it. Its size never goes up. */
export function shrunkMonster(monster: MonsterRow, fromShrinks: number): MonsterRow {
  const ratio = sizeStep(fromShrinks + 1) / sizeStep(fromShrinks);
  const size = Math.min(monster.spec.size, Math.max(0.25, monster.spec.size * ratio));
  return { ...monster, spec: { ...monster.spec, size } };
}

/**
 * "Too big", before or after a session: the task takes its smaller wording and its monster drops
 * a size. After the last size step the count still goes up and nothing gets bigger.
 */
export async function shrinkTask(ctx: DayContext, task: TaskRow): Promise<void> {
  const { tasks, monsters } = ctx.deps.repositories;
  await tasks.put({ ...task, text: smallerText(task), shrinkCount: task.shrinkCount + 1 });
  const monster = (await monsters.where('taskId', task.id))[0];
  if (monster && task.shrinkCount < MAX_SHRINKS) {
    await monsters.put(shrunkMonster(monster, task.shrinkCount));
  }
}
