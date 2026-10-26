import {
  DAY_MS,
  FUSE_MS,
  MINUTE_MS,
  PRESSURE_STEP_MINUTES,
  dayStartOf,
  type Instant,
  type Moment,
  type Task,
} from '@phusclass/domain/board';
import type { ClassLanguage } from '@phusclass/voice/class';

import type { BoardSnapshot } from '../../state/board-view';
import { lineFor } from '../desk/his-line';

/**
 * Today as the widgets and the Live Activity draw it, written to the App Group as one JSON string.
 * `targets/_shared/SurfaceSnapshot.swift` reads it field for field. Times are milliseconds since
 * 1970.
 */
export type SurfaceDayState =
  'nothing_yet' | 'task_set' | 'in_session' | 'done' | 'serious' | 'crisis';

/** The timetable (tuition): today's busy blocks, the free periods and the next one. */
export interface SurfaceTimetable {
  readonly blocks: readonly { readonly start: Instant; readonly end: Instant }[];
  readonly free: readonly { readonly start: Instant; readonly end: Instant }[];
  readonly nextFree: {
    readonly start: Instant;
    readonly end: Instant;
    readonly task: string | null;
  } | null;
}

export interface SurfaceSnapshotJson {
  readonly version: 1;
  readonly state: SurfaceDayState;
  readonly taskId: string | null;
  readonly task: string | null;
  readonly sessionStartedAt: Instant | null;
  readonly sessionEndsAt: Instant | null;
  readonly line: string | null;
  readonly sessionLines: readonly { readonly at: Instant; readonly text: string }[];
  readonly language: ClassLanguage;
  readonly dayEndsAt: Instant;
  readonly pressure: number;
  readonly pressureAt: readonly Instant[];
  readonly fuseStartsAt: Instant | null;
  readonly fuseEndsAt: Instant | null;
  readonly taskSince: Instant | null;
  readonly next: readonly string[];
  readonly more: number;
  readonly enrolled: boolean;
  readonly night: { readonly start: number; readonly end: number } | null;
  readonly lines: { readonly standBy: string | null; readonly writtenDown: string | null };
  readonly timetable: SurfaceTimetable | null;
}

/** What the surfaces need that the board does not hold. */
export interface SurfaceContext {
  readonly language: ClassLanguage;
  /** Tuition is paid: the big widgets, the timetable and StandBy open. */
  readonly enrolled: boolean;
  readonly timetable: SurfaceTimetable | null;
  /** The quiet of the night in minutes after midnight; `null` keeps 22:00 to 7:00. */
  readonly night: { readonly start: number; readonly end: number } | null;
}

/**
 * When the pressure on a waiting desk task rises next, one step at each, soonest first. None for a
 * serious or crisis task, a running period, or once it is at the top.
 */
export function pressureRises(task: Task, now: Moment, pressure: number): Instant[] {
  if (task.care !== 'none' || task.desk === null || task.desk.startedAt !== null) return [];
  const since = Math.max(task.desk.since, dayStartOf(now));
  return PRESSURE_STEP_MINUTES.map((step) => since + step * MINUTE_MS)
    .filter((at) => at > now.at)
    .slice(0, Math.max(0, 5 - pressure));
}

/** The fuse's two ends, when it is lit. */
export function fuseOfTask(task: Task, burning: boolean): { start: Instant; end: Instant } | null {
  if (!burning || task.desk === null) return null;
  return { start: task.desk.opened, end: task.desk.opened + FUSE_MS };
}

function stateOf(board: BoardSnapshot): SurfaceDayState {
  switch (board.phase) {
    case 'crisis':
      return 'crisis';
    case 'running':
    case 'time up':
      return board.desk?.heavy === true ? 'serious' : 'in_session';
    case 'waiting':
      return board.desk?.heavy === true ? 'serious' : 'task_set';
    case 'finished':
    case 'recess':
      return board.board.length === 0 ? 'done' : 'nothing_yet';
    case 'empty':
    case 'loading':
      return 'nothing_yet';
  }
}

/** The snapshot of the board as it stands, for the surfaces. */
export function surfaceSnapshotOf(
  board: BoardSnapshot,
  context: SurfaceContext,
): SurfaceSnapshotJson {
  const state = stateOf(board);
  const crisis = state === 'crisis';
  const desk = crisis || board.phase === 'finished' || board.phase === 'recess' ? null : board.desk;
  const session = crisis ? null : board.session;
  const waiting = state === 'task_set' && desk !== null;
  const fuse = waiting ? fuseOfTask(desk.task, desk.fuse !== null && desk.fuse.leftMs > 0) : null;
  const day = board.now.day;
  return {
    version: 1,
    state,
    taskId: desk?.task.id ?? null,
    task: desk?.task.text ?? null,
    sessionStartedAt: session?.startedAt ?? null,
    sessionEndsAt: session?.endsAt ?? null,
    line: null,
    sessionLines: [],
    language: context.language,
    dayEndsAt: dayStartOf(board.now) + DAY_MS,
    pressure: waiting ? desk.pressure : 0,
    pressureAt: waiting ? pressureRises(desk.task, board.now, desk.pressure) : [],
    fuseStartsAt: fuse?.start ?? null,
    fuseEndsAt: fuse?.end ?? null,
    taskSince: desk?.task.createdAt ?? null,
    next: crisis ? [] : board.chalkboard.next.map((task) => task.text),
    more: crisis ? 0 : board.chalkboard.more,
    enrolled: context.enrolled,
    night: context.night,
    lines: {
      standBy: lineFor(context.language, 'standBy', day)?.text ?? null,
      writtenDown: lineFor(context.language, 'writtenDown', day, {}, { plain: true })?.text ?? null,
    },
    timetable: context.enrolled && !crisis ? context.timetable : null,
  };
}
