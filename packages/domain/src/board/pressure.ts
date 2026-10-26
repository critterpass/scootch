import { MINUTE_MS, dayStartOf, type Instant, type Moment } from './moment';
import { isHeavy, talliesOf, type Task } from './task';

/** The short wait when the desk opens: "Two minutes. I'll wait." */
export const FUSE_MS = 2 * MINUTE_MS;

/**
 * Minutes a task has waited on the desk at which his pressure reaches steps 1 to 5. Step 0 lasts
 * as long as the fuse, so "Two minutes. I'll wait." is true; then the tea goes cold (2), arms
 * cross (5), the ruler taps (10), the full name (20) and the glare (40). Each gap roughly doubles
 * so the early steps come while the user is still deciding and the last ones only on a real
 * stand-off.
 */
export const PRESSURE_STEP_MINUTES = [2, 5, 10, 20, 40] as const;

/** Every two tally marks the task carries start it one step higher. */
export const TALLIES_PER_STEP = 2;

export type Pressure = 0 | 1 | 2 | 3 | 4 | 5;

const highest: Pressure = 5;

/**
 * His pressure on a task waiting on the desk, 0 to 5. It counts from when the task was put on the
 * desk, or from the start of today if that was earlier, and adds a step per two tallies. A running
 * period, a task off the desk, and any serious or crisis task are always 0.
 */
export function pressureOf(task: Task, now: Moment): Pressure {
  if (isHeavy(task) || task.status !== 'desk' || task.desk === null) return 0;
  if (task.desk.startedAt !== null) return 0;
  const since = Math.max(task.desk.since, dayStartOf(now));
  const minutes = Math.max(0, now.at - since) / MINUTE_MS;
  const fromTime = PRESSURE_STEP_MINUTES.filter((step) => minutes >= step).length;
  const fromTallies = Math.floor(talliesOf(task) / TALLIES_PER_STEP);
  return Math.min(highest, fromTime + fromTallies) as Pressure;
}

/** When the pressure on a waiting desk task next rises, or `null` when it will not. */
export function nextPressureAt(task: Task, now: Moment): Instant | null {
  if (pressureOf(task, now) === highest || task.desk === null) return null;
  if (isHeavy(task) || task.status !== 'desk' || task.desk.startedAt !== null) return null;
  const since = Math.max(task.desk.since, dayStartOf(now));
  const next = PRESSURE_STEP_MINUTES.map((step) => since + step * MINUTE_MS).find(
    (at) => at > now.at,
  );
  return next ?? null;
}

export type Fuse = {
  /** Milliseconds left to burn; 0 once it has burnt out. */
  readonly leftMs: number;
  /** How much has burnt, 0 to 1, for drawing it around Start. */
  readonly burnt: number;
};

/** The fuse around Start, or `null` when there is none: off the desk, running, or a heavy task. */
export function fuseOf(task: Task, now: Moment): Fuse | null {
  if (isHeavy(task) || task.status !== 'desk' || task.desk === null) return null;
  if (task.desk.startedAt !== null) return null;
  const leftMs = Math.min(FUSE_MS, Math.max(0, FUSE_MS - (now.at - task.desk.opened)));
  return { leftMs, burnt: 1 - leftMs / FUSE_MS };
}

/** Whether a start at `at` falls inside the fuse of the desk as it was opened. */
export function isInsideFuse(task: Task, at: Instant): boolean {
  if (isHeavy(task) || task.desk === null) return false;
  return at - task.desk.opened <= FUSE_MS;
}
