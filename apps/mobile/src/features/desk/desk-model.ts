import { pressureMood, type PhuMood } from '@phusclass/art/class';
import {
  DAY_MS,
  periodMinutes,
  type Happening,
  type PickReason,
  type Pressure,
  type Task,
} from '@phusclass/domain/board';
import type { ClassLanguage, Moment } from '@phusclass/voice/class';

import type { BoardSnapshot } from '../../state/board-view';

import { lineFor, type HisLine } from './his-line';

/** For this long after a task comes to the desk he says why he picked it, then waits. */
export const PICK_LINE_MS = 8000;

const PICK_MOMENTS: Partial<Record<PickReason | 'swapped', Moment>> = {
  'due today': 'pickDueToday',
  'waited longest': 'pickWaitedLongest',
  'slipped most': 'pickSlippedMost',
  'fits the time': 'pickFitsTime',
  swapped: 'swapAllowed',
};

/** How Start calls for attention as the pressure rises: a slow breath, then a nudge. */
export type StartPulse = 'none' | 'breathe slow' | 'breathe' | 'nudge slow' | 'nudge';
const PULSES: readonly StartPulse[] = [
  'none',
  'breathe slow',
  'breathe',
  'nudge slow',
  'nudge',
  'none',
];

/** What the chalkboard behind him says; the screen writes the words. */
export interface ChalkModel {
  /** Today's task, underlined. `null` on an empty board. */
  readonly main: string | null;
  /** A pop-quiz day: the chalk says so instead. */
  readonly popQuiz: boolean;
  readonly next: readonly string[];
  readonly more: number;
  /** A heavy task is on the desk: everything else can wait. */
  readonly quiet: boolean;
}

export interface DeskTaskModel {
  readonly id: string;
  readonly title: string;
  /** The user's own line for next time, shown first. */
  readonly note: string | null;
  readonly tallies: number;
  readonly frontRow: boolean;
  /** Whole days since it was said; 0 is "new". */
  readonly waitedDays: number;
}

export interface DeskModel {
  readonly phase: BoardSnapshot['phase'];
  readonly mood: PhuMood;
  readonly line: HisLine | undefined;
  /** A serious or crisis task: no fuse, pressure, chalk, happening or late slip. */
  readonly heavy: boolean;
  readonly pressure: Pressure;
  readonly task: DeskTaskModel | null;
  /** Share of the fuse left, 1 to 0, and the time left; `null` when there is no fuse. */
  readonly fuse: { readonly left: number; readonly leftMs: number } | null;
  readonly pulse: StartPulse;
  /** Pressure 4: his chalk flies at the screen and misses. */
  readonly chalkThrow: boolean;
  /** Pressure 5: his glasses are white glare. */
  readonly glare: boolean;
  readonly canSlip: boolean;
  /** The length Start gives when the user has not chosen one. */
  readonly periodMinutes: number;
  readonly happening: Happening | null;
  readonly chalk: ChalkModel;
  readonly stillYours: { readonly id: string; readonly title: string } | null;
}

export interface DeskInput {
  readonly snapshot: BoardSnapshot;
  readonly language: ClassLanguage;
  /** The full name given at roll call, for pressure 4. */
  readonly name: string | null;
}

function chalkOf(snapshot: BoardSnapshot, heavy: boolean, happening: Happening | null): ChalkModel {
  const { today, next, more } = snapshot.chalkboard;
  if (heavy) return { main: today?.text ?? null, popQuiz: false, next: [], more: 0, quiet: true };
  return {
    main: today?.text ?? null,
    popQuiz: happening === 'pop quiz',
    next: next.map((task) => task.text),
    more,
    quiet: false,
  };
}

function deskLine(input: DeskInput, task: Task, pressure: Pressure): HisLine | undefined {
  const { snapshot, language, name } = input;
  const desk = snapshot.desk;
  if (desk === null) return undefined;
  const plain = !task.screened;
  const seed = `${task.id}:${task.desk?.since ?? 0}:${pressure}`;
  const values = { task: task.text };
  const since = task.desk?.since ?? 0;

  if (desk.happening === 'pop quiz' && pressure <= 1) {
    return lineFor(language, 'happeningPopQuiz', seed, values, { plain });
  }
  if (pressure === 0) {
    const pick = desk.reason === null ? undefined : PICK_MOMENTS[desk.reason];
    if (pick !== undefined && snapshot.now.at - since < PICK_LINE_MS) {
      const minutes = snapshot.minutesFree ?? undefined;
      if (pick !== 'pickFitsTime' || minutes !== undefined) {
        const said = lineFor(
          language,
          pick,
          seed,
          { ...values, ...(minutes === undefined ? {} : { minutes }) },
          { plain },
        );
        if (said !== undefined) return said;
      }
    }
    if (desk.note !== null) return lineFor(language, 'partialNoteReturns', seed, values, { plain });
  }
  if (pressure === 4 && (name === null || name.trim() === '')) {
    // No name was given at roll call: the ruler keeps tapping instead.
    return lineFor(language, 'pressure3', seed, values, { plain });
  }
  const moment = `pressure${pressure}` as const;
  return lineFor(language, moment, seed, name === null ? values : { ...values, NAME: name }, {
    plain,
  });
}

/** The desk while the late slip is out: he peers over his glasses and asks for it. */
export function withSlipOut(model: DeskModel, language: ClassLanguage): DeskModel {
  if (model.task === null) return model;
  return { ...model, mood: 'peer', line: lineFor(language, 'slipAsk', model.task.id) };
}

/** The desk as the screen draws it, read from the store's snapshot. Pure: the same in, the same out. */
export function deskModel(input: DeskInput): DeskModel {
  const { snapshot, language } = input;
  const desk = snapshot.desk;
  const task = desk?.task ?? null;
  const heavy = desk?.heavy ?? false;
  const pressure: Pressure = desk === null || heavy ? 0 : desk.pressure;
  const happening = heavy ? null : (desk?.happening ?? null);

  let mood: PhuMood = 'calm';
  let line: HisLine | undefined;
  if (snapshot.phase === 'empty') {
    mood = 'over';
    line = lineFor(language, 'emptyDesk', snapshot.now.day);
  } else if (snapshot.phase === 'recess') {
    mood = 'over';
    line = lineFor(language, 'recessOffered', snapshot.recess?.endsAt ?? 0);
  } else if (task !== null && heavy) {
    mood = 'serious';
    line = lineFor(language, 'seriousCompany', task.id);
  } else if (task !== null) {
    mood = happening === 'pop quiz' && pressure <= 1 ? 'name' : pressureMood(pressure);
    line = deskLine(input, task, pressure);
  }

  const fuse = heavy || desk?.fuse == null ? null : desk.fuse;
  return {
    phase: snapshot.phase,
    mood,
    line,
    heavy,
    pressure,
    task:
      task === null
        ? null
        : {
            id: task.id,
            title: task.text,
            note: desk?.note ?? null,
            tallies: heavy ? 0 : (desk?.tallies ?? 0),
            frontRow: !heavy && (desk?.frontRow ?? false),
            waitedDays: Math.max(0, Math.floor((snapshot.now.at - task.createdAt) / DAY_MS)),
          },
    fuse: fuse === null ? null : { left: 1 - fuse.burnt, leftMs: fuse.leftMs },
    pulse: heavy || task === null ? 'none' : (PULSES[pressure] ?? 'none'),
    chalkThrow: !heavy && task !== null && pressure === 4,
    glare: !heavy && task !== null && pressure === 5,
    canSlip: task !== null && !heavy,
    periodMinutes: periodMinutes({ happening }),
    happening,
    chalk: chalkOf(snapshot, heavy, happening),
    stillYours:
      snapshot.stillYours === null
        ? null
        : { id: snapshot.stillYours.id, title: snapshot.stillYours.text },
  };
}
