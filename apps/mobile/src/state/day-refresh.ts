import { monsterImageName } from '../features/surfaces/monster-image';
import {
  addDays,
  morningOffer,
  returningItem,
  todayState,
  type ClockTime,
  type SessionRow,
} from '@scootch/domain';

import { dayNotifications } from './day-notifications';
import { showsComedy } from './shows-comedy';
import type { DayContext } from './day-types';

/**
 * Reads today back from storage, publishes it and brings the notifications in line. Storage is
 * the truth: this runs after every event that wrote anything.
 */
export async function readToday(
  ctx: Pick<DayContext, 'deps' | 'memory' | 'set'>,
  usualStart: ClockTime,
): Promise<void> {
  const { deps, memory, set } = ctx;
  const { repositories } = deps;
  const { localDate, settings } = memory.state;
  const tasks = await repositories.tasks.where('localDate', localDate);
  const sessions = new Map<string, SessionRow>();
  // A start is counted on the day it happened, also for a task that has since moved on.
  for (const session of await repositories.sessions.where('localDate', localDate)) {
    sessions.set(session.id, session);
  }
  for (const task of tasks) {
    for (const session of await repositories.sessions.where('taskId', task.id)) {
      sessions.set(session.id, session);
    }
  }
  const day = await repositories.days.get(localDate);
  const today = todayState({
    localDate,
    day,
    tasks,
    sessions: [...sessions.values()],
    plus: deps.plus(),
    spent: (await repositories.dayNotes.read(localDate)).startsLetGo,
  });
  const task = 'task' in today ? today.task : null;
  const monster = task ? ((await repositories.monsters.where('taskId', task.id))[0] ?? null) : null;
  const items = await repositories.drawerItems.all();
  // The reminder belongs to today's serious task while it is still only set, and to nothing else.
  const asked = await repositories.careReminder.read();
  const reminderAt =
    asked !== null &&
    today.kind === 'serious' &&
    today.session === null &&
    asked.taskId === task?.id
      ? asked.at
      : null;
  if (asked !== null && reminderAt === null) await repositories.careReminder.clear();
  // Something heavy is around: a serious task today, or one waiting in the drawer.
  const heavyToday =
    tasks.some((one) => one.screen === 'serious') || items.some((one) => one.screen === 'serious');
  // A task carried on to tomorrow waits there, and the day that is resting says so.
  const tomorrow = await repositories.tasks.where('localDate', addDays(localDate, 1));
  set({
    heavyToday,
    today,
    reminderAt,
    waitingForTomorrow:
      tomorrow.find((one) => one.carriedOver && one.status !== 'finished') ?? null,
    // Asked once a day, before the first thing is picked.
    energyNeeded: (day?.energy ?? null) === null && tasks.length === 0,
    monster,
    monsterPending:
      task !== null && (task.screen === 'unscreened' || (task.screen === 'pass' && !monster)),
    morning: morningOffer({
      today: localDate,
      lastOpenedDay: memory.lastOpenedDay,
      tasks,
      returning: returningItem(items, localDate),
      drawer: items,
    }),
    drawer: { open: memory.state.drawer.open, items },
  });
  await deps.runner.syncNotifications(
    dayNotifications({
      today,
      settings,
      localDate,
      timeZone: deps.timeZone(),
      usualStart,
      // Soft while something heavy is around.
      heavyToday,
      reminderAt,
      monster: monster ? { name: monster.name, image: monsterImageName(monster) } : null,
      // What a receipt may list: a serious thing is never on one.
      doneToday: tasks.filter(
        (one) => one.status === 'finished' && showsComedy(one, 'notification'),
      ).length,
    }),
  );
}
