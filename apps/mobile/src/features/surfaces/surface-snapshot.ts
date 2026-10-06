import {
  instantFromIso,
  type Attitude,
  type Instant,
  type Language,
  type MonsterRow,
  type SessionRow,
  type SettingsRow,
  type TaskRow,
  type TodayState,
} from '@scootch/domain';

import { liveLineTurns } from '../../effects/live-line-turns';
import { lineFor, lineWithNoTask } from '../../state/lines';

/**
 * Today as the widgets, the Live Activity and the control read it. The app writes it to the App
 * Group as one JSON string; `targets/_shared/SurfaceSnapshot.swift` decodes exactly these fields.
 * Change both together, and raise the version when an older reader could not cope.
 */
export const SURFACE_SNAPSHOT_VERSION = 1;

export type SurfaceDayState =
  'nothing_yet' | 'task_set' | 'in_session' | 'done' | 'serious' | 'crisis';

export interface SurfaceTimedLine {
  /** Milliseconds since 1970. */
  readonly at: Instant;
  readonly text: string;
}

export interface SurfaceSnapshot {
  readonly version: number;
  readonly state: SurfaceDayState;
  /** The one thing's text. Always `null` on a crisis day. */
  readonly task: string | null;
  /** The running session, in milliseconds since 1970; both `null` when none is running. */
  readonly sessionStartedAt: Instant | null;
  readonly sessionEndsAt: Instant | null;
  /** Both `null` for a serious task, on a crisis day and before the monster has hatched. */
  readonly monsterName: string | null;
  readonly monsterImage: string | null;
  /** What Scootch is saying now. `null` when there is nothing to say. */
  readonly line: string | null;
  /** The lines the Live Activity turns to during the running session, soonest first. */
  readonly sessionLines: readonly SurfaceTimedLine[];
  readonly attitude: Attitude;
  readonly language: Language;
  /** Bars in this week's record, 0 to 7. */
  readonly weekBars: number;
  /** Pieces in the world. */
  readonly worldThings: number;
  readonly plus: boolean;
  /** When the day this describes rolls over. After it, the surfaces show a day with nothing yet. */
  readonly dayEndsAt: Instant;
}

export interface SurfaceSnapshotInput {
  readonly today: TodayState;
  readonly settings: Pick<SettingsRow, 'attitude' | 'language'>;
  readonly monster: MonsterRow | null;
  /** The file the task's monster was drawn to, or `null` when there is none. */
  readonly monsterImage: string | null;
  /** The line the screen is showing for the running session, if any. */
  readonly shownLine: string | null;
  readonly weekBars: number;
  readonly worldThings: number;
  readonly plus: boolean;
  readonly dayEndsAt: Instant;
}

function running(session: SessionRow | null): session is SessionRow {
  return session !== null && session.endedAt === null;
}

/** The working lines at each of the session's line turns, continuing after the opening line. */
function sessionLines(
  task: TaskRow,
  session: SessionRow,
  settings: SurfaceSnapshotInput['settings'],
): SurfaceTimedLine[] {
  const turns = liveLineTurns(instantFromIso(session.startedAt), instantFromIso(session.endsAt));
  const lines: SurfaceTimedLine[] = [];
  turns.forEach((at, index) => {
    const text = lineFor('working', task, settings, index + 1);
    if (text !== null) lines.push({ at, text });
  });
  return lines;
}

/**
 * Builds the snapshot. The care rules are applied here once, so no surface has to know them: a
 * crisis day carries no task, monster or line at all, and a serious task carries no monster and
 * only its plain words (`lineFor` gives a quiet task nothing else).
 */
export function buildSurfaceSnapshot(input: SurfaceSnapshotInput): SurfaceSnapshot {
  const { today, settings } = input;
  const base = {
    version: SURFACE_SNAPSHOT_VERSION,
    attitude: settings.attitude,
    language: settings.language,
    weekBars: Math.max(0, Math.min(7, Math.floor(input.weekBars))),
    worldThings: Math.max(0, Math.floor(input.worldThings)),
    plus: input.plus,
    dayEndsAt: input.dayEndsAt,
  };
  const empty = {
    task: null,
    sessionStartedAt: null,
    sessionEndsAt: null,
    monsterName: null,
    monsterImage: null,
    line: null,
    sessionLines: [],
  };

  if (today.kind === 'crisis') return { ...base, ...empty, state: 'crisis' };
  if (today.kind === 'nothing_yet') {
    return { ...base, ...empty, state: 'nothing_yet', line: lineWithNoTask('waiting', settings) };
  }
  if (today.kind === 'done_for_today') {
    return { ...base, ...empty, state: 'done', line: lineWithNoTask('doneForToday', settings) };
  }

  const { task } = today;
  const session = today.kind === 'task_set' ? null : today.session;
  const live = running(session) ? session : null;
  const serious = today.kind === 'serious';
  const monster = serious ? null : input.monster;
  return {
    ...base,
    state: serious ? 'serious' : live ? 'in_session' : 'task_set',
    task: task.text,
    sessionStartedAt: live ? instantFromIso(live.startedAt) : null,
    sessionEndsAt: live ? instantFromIso(live.endsAt) : null,
    monsterName: monster?.name ?? null,
    monsterImage: monster ? input.monsterImage : null,
    line: live
      ? (input.shownLine ?? lineFor('working', task, settings, 0))
      : lineFor(serious ? 'acknowledge' : 'hatch', task, settings),
    sessionLines: live ? sessionLines(task, live, settings) : [],
  };
}
