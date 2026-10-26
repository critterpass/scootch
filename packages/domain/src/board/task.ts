import type { ClockTime, Instant, IsoDate } from './moment';

/** What the care screen decided about a task. Read from the screen, never worked out here. */
export type CareFlag = 'none' | 'serious' | 'crisis';

/** Where a task is: on the board, on the desk, finished, or rubbed off. */
export type TaskStatus = 'board' | 'desk' | 'done' | 'erased';

/** One late slip. An accepted slip gave a real reason: it is not graded and adds no tally. */
export type Slip = {
  readonly reason: string;
  readonly accepted: boolean;
  readonly at: Instant;
};

/** His written comment, lowest first. The words live in the voice pack; this is only the rung. */
export type CommentStep = 'fine' | 'good' | 'good work' | 'ten';

/** What a finish carves into the desk. The last two are the rare ones. */
export type CarvingKind =
  'initials' | 'star' | 'heart' | 'tiny phu' | 'arrow' | 'flower' | 'gold star' | 'carved ten';

/** One mark on the desk, placed by its seed. Positions are 0 to 1 across the desk top. */
export type Carving = {
  readonly taskId: string;
  readonly kind: CarvingKind;
  readonly x: number;
  readonly y: number;
  /** Degrees, -30 to 30. */
  readonly turn: number;
  readonly at: Instant;
};

export type DoneInfo = {
  readonly at: Instant;
  readonly day: IsoDate;
  /** `null` when it was ticked off the board without a period. */
  readonly periodMinutes: number | null;
  /** `null` on a serious or crisis task (it is not graded) and on a tick from the board. */
  readonly comment: CommentStep | null;
  /** `null` on a tick from the board: only a finish at the desk carves. */
  readonly carving: CarvingKind | null;
  readonly giayKhen: boolean;
};

/** A task on the desk. */
export type DeskState = {
  /** When it was put on the desk. Pressure counts from here (or from the start of today). */
  readonly since: Instant;
  /** When the desk was last opened in front of the user. The fuse burns from here. */
  readonly opened: Instant;
  /** When the running period began; `null` while the task waits. */
  readonly startedAt: Instant | null;
  /** Whether the first period on it began inside the fuse; `null` until it begins. */
  readonly insideFuse: boolean | null;
};

/** A clock time heard for one day only. */
export type HeardTime = {
  readonly day: IsoDate;
  readonly at: ClockTime;
};

export type OrderHints = {
  /** How long the task looks, when that was heard or set. Unknown counts as one period. */
  readonly minutes: number | null;
  /** When it was last swapped onto the desk by hand. */
  readonly swappedAt: Instant | null;
};

export type Task = {
  readonly id: string;
  /** In the user's own words. */
  readonly text: string;
  readonly createdAt: Instant;
  readonly dueDate: IsoDate | null;
  readonly heardTime: HeardTime | null;
  /** The last time the user did anything with it: said, reworded, swapped, started, answered. */
  readonly lastTouched: Instant;
  readonly slips: readonly Slip[];
  /** The one line left for next time by partial credit, shown first when it returns. */
  readonly partialNote: string | null;
  readonly status: TaskStatus;
  readonly desk: DeskState | null;
  readonly done: DoneInfo | null;
  readonly care: CareFlag;
  readonly screened: boolean;
  /** When "Still yours?" was asked; it is asked once. */
  readonly stillYoursAskedAt: Instant | null;
  readonly order: OrderHints;
};

/** Late slips that cost a tally on the board. */
export const FRONT_ROW_AT_TALLIES = 5;

export function newTask(input: {
  readonly id: string;
  readonly text: string;
  readonly at: Instant;
  readonly dueDate?: IsoDate | null;
  readonly heardTime?: HeardTime | null;
  readonly care?: CareFlag;
  readonly screened?: boolean;
  readonly minutes?: number | null;
}): Task {
  return {
    id: input.id,
    text: input.text,
    createdAt: input.at,
    dueDate: input.dueDate ?? null,
    heardTime: input.heardTime ?? null,
    lastTouched: input.at,
    slips: [],
    partialNote: null,
    status: 'board',
    desk: null,
    done: null,
    care: input.care ?? 'none',
    screened: input.screened ?? false,
    stillYoursAskedAt: null,
    order: { minutes: input.minutes ?? null, swappedAt: null },
  };
}

/** Serious and crisis tasks carry no fuse, tally, pressure, grade or happening. */
export function isHeavy(task: Pick<Task, 'care'>): boolean {
  return task.care !== 'none';
}

/** Tally marks on the board: late slips that were not accepted. */
export function talliesOf(task: Pick<Task, 'slips' | 'care'>): number {
  if (isHeavy(task)) return 0;
  return task.slips.filter((slip) => !slip.accepted).length;
}

/** The "front row" tag, from the fifth tally on. */
export function isFrontRow(task: Pick<Task, 'slips' | 'care'>): boolean {
  return talliesOf(task) >= FRONT_ROW_AT_TALLIES;
}

/** Still to do: on the board or on the desk. */
export function isOpen(task: Pick<Task, 'status'>): boolean {
  return task.status === 'board' || task.status === 'desk';
}

/** The time heard for this task, if it was heard for `today`. */
export function heardTimeOn(task: Pick<Task, 'heardTime'>, today: IsoDate): ClockTime | null {
  return task.heardTime !== null && task.heardTime.day === today ? task.heardTime.at : null;
}
