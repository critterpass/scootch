import {
  dayOfLurking,
  instantFromIso,
  lurkerSize,
  oldestFirst,
  type Attitude,
  type CardFinish,
  type Instant,
  type IsoDate,
  type Language,
  type MonsterRow,
  type SessionRow,
  type SettingsRow,
  type TaskRow,
  type TodayState,
} from '@scootch/domain';

import { offlinePacks } from '@scootch/voice';

import { liveLineTurns } from '../../effects/live-line-turns';
import { bitesOf } from '../../state/bites';
import { lineFor, lineWithNoTask } from '../../state/lines';
import { showsComedy } from '../../state/shows-comedy';

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

/**
 * A task's words for each state of its hunt, so a session begun with the app closed has them. A
 * serious task's are its plain words; `null` means nothing is said in that state.
 */
export interface SurfaceHuntLines {
  readonly start: string | null;
  /** Turned through while the clock runs. */
  readonly working: readonly string[];
  /** The one concrete nudge shown while stuck, and the smaller one "Give me a first line" shows. */
  readonly stuck: string | null;
  readonly firstLine: string | null;
  readonly lastMinutes: string | null;
  readonly overtime: string | null;
  readonly caught: string | null;
  readonly stoppedEarly: string | null;
}

/** A hatched thing that is waiting. Never a serious task, and there are none on a crisis day. */
export interface SurfaceLurker {
  readonly taskId: string;
  readonly name: string;
  readonly task: string;
  /** Which day of waiting the thing is on, from 1. The thing's days, never the person's. */
  readonly day: number;
  /** How big it is drawn for that day, up to 1 when it is pressed against the glass. */
  readonly size: number;
  readonly image: string | null;
  readonly lines: SurfaceHuntLines;
}

/**
 * The thing carried on to tomorrow, as the nightstand shows it once the evening is late. A
 * serious task is its plain words alone: no monster's name and no line.
 */
export interface SurfaceTomorrow {
  readonly taskId: string;
  readonly task: string;
  readonly monsterName: string | null;
  /** What Scootch says under it. */
  readonly line: string | null;
  /** What the notification says at nine, when "Hunt at 9:00" was pressed. */
  readonly morning: string;
}

/** One of a monster's three bites. */
export interface SurfaceBite {
  /** The task's id and the bite's place, 0 to 2, joined by a colon. */
  readonly id: string;
  readonly taskId: string;
  readonly text: string;
  readonly minutes: number;
  readonly caught: boolean;
}

export interface SurfaceSnapshot {
  readonly version: number;
  readonly state: SurfaceDayState;
  /** The one thing's id and its words for a hunt. Both `null` whenever `task` is. */
  readonly taskId: string | null;
  readonly taskLines: SurfaceHuntLines | null;
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
  /** The waiting monsters, the one that has waited longest first, four at most. */
  readonly lurkers: readonly SurfaceLurker[];
  /** The bites of the lurkers' monsters. */
  readonly bites: readonly SurfaceBite[];
  /** The finish the person wears, which the shelf and the caught card are made of. */
  readonly finish: CardFinish;
  /** How many monsters have been caught, and the last of them. */
  readonly shelf: number;
  readonly latestCatch: { readonly name: string; readonly caughtAt: Instant } | null;
  /** How many of them were caught in this week. */
  readonly caughtThisWeek: number;
  /** The files the world was drawn to, by day and asleep, or `null` when it could not be. */
  readonly worldImage: string | null;
  readonly worldNightImage: string | null;
  /** Scootch alone, and the wallpaper the Shortcuts action draws with these pictures. */
  readonly scootchImage: string | null;
  readonly wallpaper: SettingsRow['wallpaper'];
  /** The thing carried on to tomorrow. `null` when none is, and on a crisis day. */
  readonly tomorrow: SurfaceTomorrow | null;
  /** When the day this describes rolls over. After it, the surfaces show a day with nothing yet. */
  readonly dayEndsAt: Instant;
  /**
   * The ink the person wears, as the six-digit hex the surfaces tint with; `null` is tomato. An
   * older reader that does not know the field draws in tomato, so the version stays as it is.
   */
  readonly accent: string | null;
}

/** A thing that has not been finished, with the monster it hatched. */
export interface WaitingThing {
  readonly task: TaskRow;
  readonly monster: MonsterRow;
  /** The file the monster was drawn to, or `null` when it could not be. */
  readonly image: string | null;
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
  readonly localDate: IsoDate;
  /** Every unfinished thing with a monster; which of them may lurk is decided here. */
  readonly waiting: readonly WaitingThing[];
  readonly finish: CardFinish;
  readonly shelf: number;
  readonly latestCatch: SurfaceSnapshot['latestCatch'];
  readonly caughtThisWeek: number;
  readonly worldImage: string | null;
  readonly worldNightImage: string | null;
  readonly scootchImage: string | null;
  readonly wallpaper: SettingsRow['wallpaper'];
  /** The task carried on to tomorrow with its monster, when it has hatched one. */
  readonly carried: { readonly task: TaskRow; readonly monster: MonsterRow | null } | null;
  readonly dayEndsAt: Instant;
  /** The worn ink's accent; left out or `null` for tomato. */
  readonly accent?: string | null;
}

type Voice = SurfaceSnapshotInput['settings'];

/** How many of the offline pack's working lines a task with no lines of its own turns through. */
const OFFLINE_WORKING_TURNS = 3;

/** The task's words for each state of a hunt. `lineFor` already keeps a quiet task to plain words. */
function huntLines(task: TaskRow, settings: Voice): SurfaceHuntLines {
  const working: string[] = [];
  const turns = task.lines?.working.length ?? OFFLINE_WORKING_TURNS;
  for (let turn = 0; turn < turns; turn += 1) {
    const text = lineFor('working', task, settings, turn);
    if (text !== null && !working.includes(text)) working.push(text);
  }
  const stuck = lineFor('tinyNextStep', task, settings, 0);
  const smaller = lineFor('tinyNextStep', task, settings, 1);
  return {
    start: lineFor('start', task, settings),
    working,
    stuck,
    firstLine: smaller === stuck ? null : smaller,
    lastMinutes: lineFor('twoMinutesLeft', task, settings),
    overtime: lineFor('timeUp', task, settings),
    caught: lineFor('caught', task, settings),
    stoppedEarly: lineFor('notFinished', task, settings),
  };
}

/**
 * The waiting things that may be shown as monsters. The care flag decides, through the one place
 * that answers it: a serious task never lurks, with or without "it's fine, be funny".
 */
function lurkers(input: SurfaceSnapshotInput): Pick<SurfaceSnapshot, 'lurkers' | 'bites'> {
  const shown = input.waiting
    .filter(({ task, monster }) => task.status !== 'finished' && monster.caughtAt === null)
    .filter(({ task }) => showsComedy(task, 'monster'))
    .map(({ task, monster, image }) => {
      const day = dayOfLurking(task.firstMentionedOn, input.localDate);
      const caught = task.bitesCaught ?? [];
      return {
        taskId: task.id,
        name: monster.name,
        task: task.text,
        day,
        size: lurkerSize(day),
        image,
        lines: huntLines(task, input.settings),
        bites: bitesOf(task).map(({ text, minutes }, place): SurfaceBite => ({
          id: `${task.id}:${place}`,
          taskId: task.id,
          text,
          minutes,
          caught: caught.includes(place),
        })),
      };
    });
  const oldest = oldestFirst(shown);
  return {
    lurkers: oldest.map(({ bites: _bites, ...lurker }) => lurker),
    bites: oldest.flatMap(({ bites }) => bites),
  };
}

/** Tomorrow's one thing. The care flag decides whether it has a monster and a line at all. */
function tomorrow(input: SurfaceSnapshotInput): SurfaceTomorrow | null {
  if (input.carried === null) return null;
  const { task, monster } = input.carried;
  const { settings } = input;
  const funny = showsComedy(task, 'monster') && monster !== null;
  return {
    taskId: task.id,
    task: task.text,
    monsterName: funny ? monster.name : null,
    line: funny
      ? lineWithNoTask('asleepTillTomorrow', settings).replace('{name}', monster.name)
      : null,
    morning:
      (showsComedy(task, 'notification') ? lineFor('start', task, settings) : null) ??
      offlinePacks[settings.language].plain.reminder,
  };
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
    finish: input.finish,
    shelf: Math.max(0, Math.floor(input.shelf)),
    latestCatch: input.latestCatch,
    caughtThisWeek: Math.max(0, Math.floor(input.caughtThisWeek)),
    worldImage: input.worldImage,
    worldNightImage: input.worldNightImage,
    scootchImage: input.scootchImage,
    wallpaper: input.wallpaper,
    tomorrow: tomorrow(input),
    dayEndsAt: input.dayEndsAt,
    accent: input.accent ?? null,
  };
  const empty = {
    task: null,
    taskId: null,
    taskLines: null,
    sessionStartedAt: null,
    sessionEndsAt: null,
    monsterName: null,
    monsterImage: null,
    line: null,
    sessionLines: [],
  };

  // Nothing of the day on a crisis day: no lurker, and nothing kept from before it either.
  if (today.kind === 'crisis') {
    return {
      ...base,
      ...empty,
      state: 'crisis',
      lurkers: [],
      bites: [],
      latestCatch: null,
      tomorrow: null,
    };
  }
  const waiting = lurkers(input);
  if (today.kind === 'nothing_yet') {
    const line = lineWithNoTask('waiting', settings);
    return { ...base, ...empty, ...waiting, state: 'nothing_yet', line };
  }
  if (today.kind === 'done_for_today') {
    const line = lineWithNoTask('doneForToday', settings);
    return { ...base, ...empty, ...waiting, state: 'done', line };
  }

  const { task } = today;
  const session = today.kind === 'task_set' ? null : today.session;
  const live = running(session) ? session : null;
  const serious = today.kind === 'serious';
  const monster = serious ? null : input.monster;
  return {
    ...base,
    ...waiting,
    state: serious ? 'serious' : live ? 'in_session' : 'task_set',
    task: task.text,
    taskId: task.id,
    taskLines: huntLines(task, settings),
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
