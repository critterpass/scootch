import {
  INSTRUMENT_BY_WEEKDAY,
  type Id,
  type IsoWeek,
  type MonsterRow,
  type RecordBarRow,
  type TaskRow,
  type WeekRecordRow,
  type WorkMode,
} from '@scootch/domain';
import type { RecordInstrument } from '@scootch/sound';

/** One bar on the record's liner notes: its instrument, its day and the task that earned it. */
export interface RecordRow {
  /** 1 (Monday) to 7 (Sunday). */
  readonly position: number;
  readonly instrument: RecordInstrument;
  readonly seed: string;
  /** The monster caught that day. A serious day has none, and its row names no task. */
  readonly monster: MonsterRow | null;
  readonly taskText: string | null;
  /** The kind of work the task was, when it was told apart: what Scootch is drawn doing. */
  readonly workMode: WorkMode | null;
}

/** A week's record as the screen shows it. Only what was earned is listed; nothing is missing. */
export interface WeekView {
  readonly week: IsoWeek;
  /** The week's number in its year, for the plain name "Week 41". */
  readonly weekNumber: number;
  readonly rows: readonly RecordRow[];
  readonly barCount: number;
  /** A full band: all seven days. */
  readonly full: boolean;
  /** The next day that can still add its instrument this week, or `null`. */
  readonly waitingFor: { readonly position: number; readonly instrument: RecordInstrument } | null;
  /** The name written for the week, when one has been stored. */
  readonly name: string | null;
  readonly linerNote: string | null;
}

export interface WeekInput {
  readonly week: IsoWeek;
  readonly bars: readonly RecordBarRow[];
  readonly monsters: readonly MonsterRow[];
  readonly tasks: ReadonlyMap<Id, Pick<TaskRow, 'text'> & Partial<Pick<TaskRow, 'workMode'>>>;
  readonly weekRecords: readonly WeekRecordRow[];
  /** Today's place in this week, 1 to 7, or `null` when the week is over. */
  readonly todayPosition: number | null;
}

export function weekView(input: WeekInput): WeekView {
  const monsters = new Map(input.monsters.map((monster) => [monster.id, monster]));
  const rows = input.bars
    .filter((bar) => bar.week === input.week)
    .sort((a, b) => a.position - b.position)
    .map((bar): RecordRow => {
      const monster = (bar.monsterId && monsters.get(bar.monsterId)) || null;
      const task = monster ? input.tasks.get(monster.taskId) : undefined;
      return {
        position: bar.position,
        instrument: bar.instrument,
        seed: bar.seed,
        monster,
        taskText: task?.text ?? null,
        workMode: task?.workMode ?? null,
      };
    });

  const earned = new Set(rows.map((row) => row.position));
  const { todayPosition } = input;
  const next =
    todayPosition === null ? null : earned.has(todayPosition) ? todayPosition + 1 : todayPosition;
  const instrument = next === null ? undefined : INSTRUMENT_BY_WEEKDAY[next - 1];
  const stored = input.weekRecords.find((record) => record.week === input.week);
  return {
    week: input.week,
    weekNumber: Number(input.week.slice(-2)),
    rows,
    barCount: rows.length,
    full: rows.length === 7,
    waitingFor: next !== null && instrument ? { position: next, instrument } : null,
    name: stored?.name ?? null,
    linerNote: stored?.linerNote ?? null,
  };
}

/** Sharing the week is offered only when a bar came from a task that has a monster. */
export function weekShareOffered(view: WeekView): boolean {
  return view.rows.some((row) => row.monster !== null);
}
