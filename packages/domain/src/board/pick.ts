import { isFaded } from './fading';
import { DAY_MS, minutesOf, type Moment } from './moment';
import { heardTimeOn, isOpen, talliesOf, type Task } from './task';

/**
 * Why he put a task where it is, so a line can be chosen for it.
 * - `due today`: due today, heard with a time today, or its day has come and gone and it is
 *   still here.
 * - `waited longest` / `slipped most`: it has waited a while or carries tally marks.
 * - `fits the time`: it fits the minutes free before something the user has to get to.
 * - `next up`: nothing else to say; the oldest of the fresh tasks.
 * - `due soon`: dated for a later day. A dated task comes to the desk on its day, so these follow
 *   everything else, nearest first.
 */
export type PickReason =
  'due today' | 'waited longest' | 'slipped most' | 'fits the time' | 'next up' | 'due soon';

export type Ranked = { readonly task: Task; readonly reason: PickReason };

export type PickContext = {
  readonly now: Moment;
  /** Minutes free before the next thing the user must get ready for, when there is one. */
  readonly freeMinutes?: number | null;
};

/** A task has "waited" once it has been on the board this many days, or carries a tally. */
export const WAITED_FROM_DAYS = 3;
/** A tally weighs as much as this many days of waiting. */
export const DAYS_PER_TALLY = 3;
/** A task whose size was never heard is taken to be one period long. */
export const UNKNOWN_SIZE_MINUTES = 10;
/** Class ends this many minutes before a time heard today, so there is time to get ready. */
export const GET_READY_MINUTES = 15;

function waitedDays(task: Task, now: Moment): number {
  return Math.max(0, Math.floor((now.at - task.createdAt) / DAY_MS));
}

function sizeOf(task: Task): number {
  return task.order.minutes ?? UNKNOWN_SIZE_MINUTES;
}

function minutesOrLast(time: string | null): number {
  return time === null ? Infinity : (minutesOf(time) ?? Infinity);
}

/** Earliest heard time first, then the earliest due day, then the oldest. */
function byDueToday(today: string) {
  return (a: Task, b: Task): number => {
    const [ta, tb] = [heardTimeOn(a, today), heardTimeOn(b, today)];
    const [ma, mb] = [minutesOrLast(ta), minutesOrLast(tb)];
    if (ma !== mb) return ma - mb;
    const [da, db] = [a.dueDate ?? '', b.dueDate ?? ''];
    if (da !== db) return da < db ? -1 : 1;
    return a.createdAt - b.createdAt;
  };
}

/**
 * Every open task in his order (brief 3): anything due today, then what has waited longest or
 * been slipped most, then what fits the time there is, then the rest of the fresh ones, then
 * tasks dated for later days, and last the faded ones. The task on the desk is ranked like any
 * other.
 */
export function boardOrder(tasks: readonly Task[], context: PickContext): Ranked[] {
  const { now } = context;
  const today = now.day;
  const open = tasks.filter(isOpen);
  const faded = open.filter((task) => isFaded(task, now));
  const live = open.filter((task) => !isFaded(task, now));

  const isDue = (task: Task) =>
    (task.dueDate !== null && task.dueDate <= today) || heardTimeOn(task, today) !== null;
  const due = live.filter(isDue);
  const later = live.filter((task) => !isDue(task) && task.dueDate !== null);
  const undated = live.filter((task) => !isDue(task) && task.dueDate === null);
  const hasWaited = (task: Task) =>
    waitedDays(task, now) >= WAITED_FROM_DAYS || talliesOf(task) > 0;
  const waiting = undated.filter(hasWaited);
  const fresh = undated.filter((task) => !hasWaited(task));

  const mostTallies = Math.max(0, ...open.map(talliesOf));
  const weight = (task: Task) => waitedDays(task, now) + DAYS_PER_TALLY * talliesOf(task);
  const waitingReason = (task: Task): PickReason =>
    talliesOf(task) > 0 &&
    talliesOf(task) === mostTallies &&
    DAYS_PER_TALLY * talliesOf(task) >= waitedDays(task, now)
      ? 'slipped most'
      : 'waited longest';

  const free = context.freeMinutes ?? null;
  const fits = (task: Task) => free !== null && sizeOf(task) <= free;
  const oldest = (a: Task, b: Task) => a.createdAt - b.createdAt;

  return [
    ...due.sort(byDueToday(today)).map((task) => ({ task, reason: 'due today' as const })),
    ...waiting
      .sort((a, b) => weight(b) - weight(a) || oldest(a, b))
      .map((task) => ({ task, reason: waitingReason(task) })),
    ...fresh
      .filter(fits)
      .sort(oldest)
      .map((task) => ({ task, reason: 'fits the time' as const })),
    ...fresh
      .filter((task) => !fits(task))
      .sort(oldest)
      .map((task) => ({ task, reason: 'next up' as const })),
    ...later
      .sort((a, b) => ((a.dueDate ?? '') < (b.dueDate ?? '') ? -1 : 1) || oldest(a, b))
      .map((task) => ({ task, reason: 'due soon' as const })),
    ...faded
      .sort((a, b) => a.lastTouched - b.lastTouched)
      .map((task) => ({ task, reason: 'waited longest' as const })),
  ];
}

/**
 * The task he puts on the desk next, and why. The task already on the desk and faded tasks are
 * never picked; `null` when the board is empty ("Nothing on the board? Suspicious.").
 */
export function pickNext(tasks: readonly Task[], context: PickContext): Ranked | null {
  return (
    boardOrder(tasks, context).find(
      ({ task }) => task.status === 'board' && !isFaded(task, context.now),
    ) ?? null
  );
}

/**
 * Minutes free before the earliest time heard for today that is still ahead, less the time to
 * get ready. `null` when nothing is heard for today.
 */
export function minutesFree(tasks: readonly Task[], now: Moment): number | null {
  const ahead = tasks
    .filter(isOpen)
    .map((task) => heardTimeOn(task, now.day))
    .map((time) => (time === null ? null : minutesOf(time)))
    .filter((minutes): minutes is number => minutes !== null && minutes > now.minuteOfDay);
  if (ahead.length === 0) return null;
  return Math.max(0, Math.min(...ahead) - now.minuteOfDay - GET_READY_MINUTES);
}
