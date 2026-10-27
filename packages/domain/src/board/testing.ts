import { MINUTE_MS, DAY_MS, momentAt, type Moment } from './moment';
import { newTask, type CareFlag, type Slip, type Task } from './task';

/** A moment on a UTC wall clock: `when('2026-10-27', '09:00')`. */
export function when(day: string, time = '09:00'): Moment {
  return momentAt(Date.parse(`${day}T${time}:00Z`), 'UTC');
}

/** The same moment some minutes later. */
export function later(moment: Moment, minutes: number): Moment {
  return momentAt(moment.at + minutes * MINUTE_MS, 'UTC');
}

export type TaskOver = Partial<Omit<Task, 'id'>> & {
  readonly daysOld?: number;
  readonly tallies?: number;
  readonly accepted?: number;
};

let counter = 0;

/** A task said `daysOld` days before `now`, on the board unless told otherwise. */
export function aTask(now: Moment, over: TaskOver = {}, id?: string): Task {
  counter += 1;
  const { daysOld = 0, tallies = 0, accepted = 0, ...rest } = over;
  const said = now.at - daysOld * DAY_MS;
  const slips: Slip[] = [
    ...Array.from({ length: tallies }, (_, index) => ({
      reason: 'traffic',
      accepted: false,
      at: said + index,
    })),
    ...Array.from({ length: accepted }, (_, index) => ({
      reason: 'hospital',
      accepted: true,
      at: said + tallies + index,
    })),
  ];
  return {
    ...newTask({ id: id ?? `task-${counter}`, text: rest.text ?? `Task ${counter}`, at: said }),
    slips,
    ...rest,
  };
}

/** A task waiting on the desk since `since`. */
export function onDesk(since: Moment, over: TaskOver = {}, care: CareFlag = 'none'): Task {
  return aTask(since, {
    status: 'desk',
    desk: { since: since.at, opened: since.at, startedAt: null, insideFuse: null },
    care,
    ...over,
  });
}
