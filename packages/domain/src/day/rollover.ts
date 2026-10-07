import type { Id, IsoDate, TaskRow } from '../contracts';

import { daysBetween } from './local-time';
import { LONG_AWAY_DAYS } from './morning';
import { isQuietTask } from './today-state';

export interface RolloverInput {
  readonly today: IsoDate;
  readonly tasks: readonly TaskRow[];
  /** Every day the app has been opened on, today included or not. */
  readonly openedDays: readonly IsoDate[];
  /** The last day the app was opened before today; `null` on a first launch. */
  readonly lastOpenedDay: IsoDate | null;
  /** The drawer's ids. A task whose id is in the drawer is already waiting there. */
  readonly parkedIds: readonly Id[];
  /** A dated thing is back this morning as the one thing, so nothing is carried beside it. */
  readonly deadlineReturns: boolean;
}

export interface Rollover {
  /** The one task that is back this morning, as it is to be stored; `null` when none is. */
  readonly carried: TaskRow | null;
  /** The tasks that go to the drawer. Their rows, monsters and lines are kept. */
  readonly parked: readonly TaskRow[];
}

/** A task from an earlier day that was never finished and is not yet waiting in the drawer. */
function leftBehind(task: TaskRow, input: RolloverInput): boolean {
  return (
    task.status !== 'finished' && task.localDate < input.today && !input.parkedIds.includes(task.id)
  );
}

/**
 * What becomes of every unfinished task when a new day is opened. Nothing is ever dropped: each
 * one is either back this morning as the carried task, or waits in the drawer.
 *
 * A task gets one carried morning. The newest task that has not had its morning yet is carried,
 * whether it was carried on purpose or simply left, and however many days were skipped in between.
 * A task that already had its morning and was left again goes to the drawer; so does everything
 * else. After a long while away nothing is carried at all, because that morning asks for the
 * smallest thing; a serious task is never put in front of the person unasked; and a dated thing
 * that is back today is the one thing, with nothing carried beside it.
 */
export function rollOver(input: RolloverInput): Rollover {
  const left = input.tasks.filter((task) => leftBehind(task, input));
  const away = input.lastOpenedDay === null ? 0 : daysBetween(input.lastOpenedDay, input.today);
  const busy = input.tasks.some(
    (task) => task.localDate === input.today && task.status !== 'finished',
  );
  const hadItsMorning = (task: TaskRow) =>
    task.carriedOver && input.openedDays.includes(task.localDate);

  const next =
    busy || input.deadlineReturns || away >= LONG_AWAY_DAYS
      ? undefined
      : left
          .filter((task) => !isQuietTask(task) && !hadItsMorning(task))
          .sort(
            (a, b) =>
              b.localDate.localeCompare(a.localDate) ||
              b.createdAt.localeCompare(a.createdAt) ||
              b.id.localeCompare(a.id),
          )[0];

  return {
    carried: next ? { ...next, localDate: input.today, carriedOver: true, status: 'set' } : null,
    parked: left.filter((task) => task.id !== next?.id),
  };
}
