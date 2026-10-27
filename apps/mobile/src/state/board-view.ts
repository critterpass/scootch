import {
  MINUTE_MS,
  boardOrder,
  classDay,
  fadeStateOf,
  fuseOf,
  happeningFor,
  hasHeavyToday,
  isFrontRow,
  isOpen,
  logbook,
  longBoardRemark,
  minutesFree,
  nextPressureAt,
  pressureOf,
  stillYoursToAsk,
  talliesOf,
  tuitionNoticeDue,
  type Carving,
  type ClassDay,
  type Finish,
  type Fuse,
  type Happening,
  type Instant,
  type IsoDate,
  type LogbookEntry,
  type Moment,
  type PickReason,
  type Pressure,
  type Ranked,
  type SlipOutcome,
  type Task,
} from '@phusclass/domain/board';

/** A period running on the desk task. */
export type OpenSession = {
  readonly id: string;
  readonly taskId: string;
  readonly startedAt: Instant;
  readonly minutes: number;
  readonly happening: Happening | null;
};

/** Everything the store keeps between readings. */
export type BoardState = {
  readonly ready: boolean;
  readonly tasks: readonly Task[];
  readonly carvings: readonly Carving[];
  readonly session: OpenSession | null;
  /** Why the task on the desk is there. */
  readonly deskReason: PickReason | 'swapped' | null;
  readonly lastFinish: (Finish & { readonly happening: Happening | null }) | null;
  readonly lastSlip: { readonly taskId: string; readonly outcome: SlipOutcome } | null;
  readonly recess: { readonly startedAt: Instant } | null;
  readonly recessOffered: boolean;
  readonly finishes: number;
  readonly longBoardRemarkedOn: IsoDate | null;
  readonly tuitionPinnedAt: Instant | null;
  readonly enrolled: boolean;
  /** The day the crisis screen was shown and is still open, if it is. */
  readonly crisisOpenOn: IsoDate | null;
  /** The last day the crisis screen was shown at all. */
  readonly crisisShownOn: IsoDate | null;
  /** His birthday, `MM-DD`, fixed once per install. */
  readonly birthday: string | null;
  readonly celsius: number | null;
  /** The period length set in settings, in minutes. A pop quiz still makes it fifteen. */
  readonly periodLength: number;
  /** The school drum sounds at the start and end of a period. */
  readonly drum: boolean;
};

export const RECESS_MS = 5 * MINUTE_MS;

export type Phase =
  'loading' | 'crisis' | 'empty' | 'waiting' | 'running' | 'time up' | 'finished' | 'recess';

export type DeskView = {
  readonly task: Task;
  readonly reason: PickReason | 'swapped' | null;
  readonly pressure: Pressure;
  /** `null` on a heavy task or once the period runs. */
  readonly fuse: Fuse | null;
  readonly nextPressureAt: Instant | null;
  readonly happening: Happening | null;
  readonly tallies: number;
  readonly frontRow: boolean;
  /** The user's own line for next time, shown first. */
  readonly note: string | null;
  readonly heavy: boolean;
};

export type SessionView = OpenSession & { readonly endsAt: Instant; readonly leftMs: number };

export type BoardSnapshot = {
  readonly now: Moment;
  readonly phase: Phase;
  readonly desk: DeskView | null;
  readonly session: SessionView | null;
  /** Every open task in his order; empty while the crisis screen is open. */
  readonly board: readonly Ranked[];
  /** The chalkboard behind him: today's task, the next two and how many more. */
  readonly chalkboard: {
    readonly today: Task | null;
    readonly next: readonly Task[];
    readonly more: number;
  };
  readonly faded: ReadonlySet<string>;
  readonly logbook: readonly LogbookEntry[];
  readonly carvings: readonly Carving[];
  readonly day: ClassDay;
  readonly minutesFree: number | null;
  readonly longBoard: boolean;
  readonly stillYours: Task | null;
  readonly lastFinish: BoardState['lastFinish'];
  readonly lastSlip: BoardState['lastSlip'];
  readonly recess: { readonly endsAt: Instant; readonly leftMs: number } | null;
  readonly recessOffered: boolean;
  readonly tuitionNotice: boolean;
  readonly heavyToday: boolean;
  readonly periodLength: number;
  readonly drum: boolean;
};

/** The happening fixed for one sitting at the desk: the task and when it was put there. */
export function deskHappening(task: Task): Happening | null {
  if (task.desk === null) return null;
  return happeningFor({ seed: `${task.id}:${task.desk.since}`, care: task.care });
}

/** The store's state read at one moment: the screens draw only this. */
export function viewOf(state: BoardState, now: Moment): BoardSnapshot {
  const crisisOpen = state.crisisOpenOn === now.day;
  const tasks = state.tasks;
  const deskTask = tasks.find((task) => task.status === 'desk') ?? null;
  const session =
    state.session !== null && deskTask?.id === state.session.taskId ? state.session : null;
  const sessionView =
    session === null
      ? null
      : {
          ...session,
          endsAt: session.startedAt + session.minutes * MINUTE_MS,
          leftMs: Math.max(0, session.startedAt + session.minutes * MINUTE_MS - now.at),
        };
  const recess =
    state.recess !== null && now.at < state.recess.startedAt + RECESS_MS
      ? {
          endsAt: state.recess.startedAt + RECESS_MS,
          leftMs: state.recess.startedAt + RECESS_MS - now.at,
        }
      : null;
  const heavyToday = hasHeavyToday(tasks, now) || state.crisisShownOn === now.day;
  const order = crisisOpen ? [] : boardOrder(tasks, { now, freeMinutes: minutesFree(tasks, now) });
  const others = order.filter(({ task }) => task.status !== 'desk').map(({ task }) => task);

  const phase: Phase = !state.ready
    ? 'loading'
    : crisisOpen
      ? 'crisis'
      : recess !== null
        ? 'recess'
        : sessionView !== null
          ? sessionView.leftMs > 0
            ? 'running'
            : 'time up'
          : deskTask !== null
            ? 'waiting'
            : state.lastFinish !== null
              ? 'finished'
              : 'empty';

  return {
    now,
    phase,
    desk:
      deskTask === null || crisisOpen
        ? null
        : {
            task: deskTask,
            reason: state.deskReason,
            pressure: pressureOf(deskTask, now),
            fuse: fuseOf(deskTask, now),
            nextPressureAt: nextPressureAt(deskTask, now),
            happening: session?.happening ?? deskHappening(deskTask),
            tallies: talliesOf(deskTask),
            frontRow: isFrontRow(deskTask),
            note: deskTask.partialNote,
            heavy: deskTask.care !== 'none',
          },
    session: crisisOpen ? null : sessionView,
    board: order,
    chalkboard: {
      today: crisisOpen ? null : deskTask,
      next: others.slice(0, 2),
      more: Math.max(0, others.length - 2),
    },
    faded: new Set(
      tasks.filter((task) => isOpen(task) && fadeStateOf(task, now) !== 'clear').map((t) => t.id),
    ),
    logbook: logbook([...tasks]),
    carvings: state.carvings,
    day: classDay(now.day, { celsius: state.celsius, birthday: state.birthday }),
    minutesFree: minutesFree(tasks, now),
    longBoard: !crisisOpen && longBoardRemark(tasks, now.day, state.longBoardRemarkedOn) !== null,
    stillYours: crisisOpen ? null : stillYoursToAsk(tasks, now),
    lastFinish: state.lastFinish,
    lastSlip: state.lastSlip,
    recess,
    recessOffered: state.recessOffered,
    tuitionNotice: tuitionNoticeDue({
      now,
      finishes: state.finishes,
      atRecess: recess !== null,
      heavyToday,
      enrolled: state.enrolled,
      lastPinnedAt: state.tuitionPinnedAt,
    }),
    heavyToday,
    periodLength: state.periodLength,
    drum: state.drum,
  };
}
