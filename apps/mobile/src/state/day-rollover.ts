import {
  fadeDrawer,
  isoFromInstant,
  parkTasks,
  rollOver,
  type IsoDate,
  type TaskRow,
} from '@scootch/domain';

import type { DayContext } from './day-types';

type Opening = Pick<DayContext, 'deps' | 'memory' | 'now'>;

/** A session nobody ended is over once its day is: it is recorded as left, and nothing is said. */
async function endOpenSessions(ctx: Opening, task: TaskRow): Promise<void> {
  const { sessions } = ctx.deps.repositories;
  for (const row of await sessions.where('taskId', task.id)) {
    if (row.endedAt !== null) continue;
    const endsAt = Date.parse(row.endsAt);
    await sessions.put({
      ...row,
      endedAt: isoFromInstant(Math.min(endsAt, ctx.now())),
      outcome: row.outcome ?? 'left_early',
    });
  }
}

/** Puts tasks into the drawer whole: their rows, monsters and lines stay, under the same id. */
export async function parkWhole(
  ctx: Opening,
  tasks: readonly TaskRow[],
  today: IsoDate,
): Promise<void> {
  if (tasks.length === 0) return;
  const { drawerItems } = ctx.deps.repositories;
  const { drawer, replacedIds } = parkTasks({
    drawer: await drawerItems.all(),
    tasks,
    today,
    now: ctx.now(),
  });
  for (const id of replacedIds) await drawerItems.remove(id);
  for (const task of tasks) {
    const item = drawer.find((one) => one.id === task.id);
    if (item) await drawerItems.put(item);
  }
}

/**
 * A new day is opened: what was left unfinished on earlier days is brought along, by the domain's
 * rule. One task may be back as the carried one; everything else waits in the drawer. Undated
 * things whose two weeks are up leave the drawer without a word, and a task parked whole leaves
 * with them.
 */
export async function openDay(
  ctx: Opening,
  today: IsoDate,
  openedDays: readonly IsoDate[],
): Promise<void> {
  const { repositories } = ctx.deps;
  const { fadedIds, kept } = fadeDrawer(await repositories.drawerItems.all(), today);
  for (const id of fadedIds) {
    await repositories.drawerItems.remove(id);
    await repositories.forgetTask(id);
  }

  const { carried, parked } = rollOver({
    today,
    tasks: await repositories.tasks.all(),
    openedDays,
    lastOpenedDay: ctx.memory.lastOpenedDay,
    parkedIds: kept.map((item) => item.id),
    deadlineReturns: false,
  });
  for (const task of carried ? [carried, ...parked] : parked) await endOpenSessions(ctx, task);
  if (carried) await repositories.tasks.put(carried);
  await parkWhole(ctx, parked, today);
}
