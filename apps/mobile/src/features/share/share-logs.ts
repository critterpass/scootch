import type { ReceiptRow } from '@scootch/art';
import {
  instantFromIso,
  localDateTime,
  type IsoDate,
  type MonsterRow,
  type MonsterSpec,
  type TaskRow,
} from '@scootch/domain';

import { shareOffered } from './share-rules';

// What the day's receipt and the month's poster are counted from. Both are counted here, from the
// phone's own rows, and both leave out every task that may not be shared: a serious one, a
// private one, one nobody has screened and one that is no longer stored.

type Task = Pick<TaskRow, 'id' | 'text' | 'screen' | 'sharePrivate'>;
type Caught = MonsterRow & { caughtAt: string; caughtOn: IsoDate };

const isCaught = (monster: MonsterRow): monster is Caught =>
  monster.caughtAt !== null && monster.caughtOn !== null;

/** The monsters caught whose task may be shared, with that task. */
function shareable(
  monsters: readonly MonsterRow[],
  tasks: ReadonlyMap<string, Task>,
): { readonly monster: Caught; readonly task: Task }[] {
  return monsters.flatMap((monster) => {
    const task = tasks.get(monster.taskId) ?? null;
    return isCaught(monster) && task !== null && shareOffered(task) ? [{ monster, task }] : [];
  });
}

const two = (value: number): string => String(value).padStart(2, '0');

/** The day's done log: what the receipt lists and totals. */
export interface DayLog {
  readonly date: IsoDate;
  readonly rows: readonly ReceiptRow[];
  readonly caught: number;
  readonly minutes: number;
}

/**
 * The things caught on a day, in the order they were caught. With the task hidden a row reads the
 * monster's name in place of the task's words. `null` when the day has nothing to print.
 */
export function dayLog(
  monsters: readonly MonsterRow[],
  tasks: ReadonlyMap<string, Task>,
  date: IsoDate,
  timeZone: string,
  hideTask: boolean,
): DayLog | null {
  const today = shareable(monsters, tasks)
    .filter(({ monster }) => monster.caughtOn === date)
    .sort((a, b) => instantFromIso(a.monster.caughtAt) - instantFromIso(b.monster.caughtAt));
  if (today.length === 0) return null;
  return {
    date,
    rows: today.map(({ monster, task }) => {
      const at = localDateTime(instantFromIso(monster.caughtAt), timeZone);
      return {
        label: hideTask ? monster.name : task.text,
        time: `${two(at.hour)}:${two(at.minute)}`,
      };
    }),
    caught: today.length,
    minutes: today.reduce((sum, { monster }) => sum + (monster.catchMinutes ?? 0), 0),
  };
}

/** A month, wrapped: what the poster prints. */
export interface MonthWrap {
  readonly year: number;
  readonly month: number;
  readonly caught: number;
  readonly monsters: readonly MonsterSpec[];
  readonly most: { readonly kind: string; readonly times: number } | null;
  readonly bestWeekday: number | null;
}

/** The value that occurs most, and how often; `null` when none occurs twice or two tie for most. */
function clearMost<T>(values: readonly T[]): { readonly value: T; readonly times: number } | null {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  const [first, second] = ranked;
  if (!first || first[1] < 2 || (second && second[1] === first[1])) return null;
  return { value: first[0], times: first[1] };
}

/** The month before the one `date` is in. */
export function monthBefore(date: IsoDate): { readonly year: number; readonly month: number } {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/**
 * A month's catches, newest first. The kind caught most and the best weekday are said only when
 * one clearly stands out. `null` when nothing shareable was caught that month.
 */
export function monthWrap(
  monsters: readonly MonsterRow[],
  tasks: ReadonlyMap<string, Task>,
  year: number,
  month: number,
): MonthWrap | null {
  const prefix = `${year}-${two(month)}-`;
  const caught = shareable(monsters, tasks)
    .map(({ monster }) => monster)
    .filter((monster) => monster.caughtOn.startsWith(prefix))
    .sort((a, b) => instantFromIso(b.caughtAt) - instantFromIso(a.caughtAt));
  if (caught.length === 0) return null;
  const kind = clearMost(caught.map((monster) => monster.title));
  const weekday = clearMost(
    caught.map((monster) => new Date(`${monster.caughtOn}T00:00:00Z`).getUTCDay()),
  );
  return {
    year,
    month,
    caught: caught.length,
    monsters: caught.map((monster) => monster.spec),
    most: kind ? { kind: kind.value, times: kind.times } : null,
    bestWeekday: weekday?.value ?? null,
  };
}
