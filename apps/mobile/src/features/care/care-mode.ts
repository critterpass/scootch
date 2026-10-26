import type { Task } from '@phusclass/domain/board';

import type { BoardSnapshot } from '../../state/board-view';

/**
 * How much care the screen in front of the person asks for.
 * - `crisis`: the crisis screen is open today. Every task is hidden; only the helplines show.
 * - `plain`: the crisis screen was closed. The board is back and he keeps plain company, with no
 *   joke, no pressure and nothing sold, until the next thing said is screened fresh.
 * - `serious`: the task on the desk is heavy. Quiet, grey, glasses off.
 * - `normal`: the act.
 */
export type CareMode = 'crisis' | 'plain' | 'serious' | 'normal';

/** What a screen may show in a care mode. */
export interface CareTreatment {
  readonly mode: CareMode;
  /** Tasks are shown at all. */
  readonly tasksShown: boolean;
  /** The fuse, rising pressure, a thrown chalk, tally marks and the late slip. */
  readonly pressure: boolean;
  /** Pointed lines, grades, happenings, bursts, confetti and sharing. */
  readonly act: boolean;
  /** Tuition notices and anything else sold. */
  readonly selling: boolean;
  /** Notes home. */
  readonly notes: boolean;
}

/** The plain company kept after the crisis screen is closed: since when, and on which day. */
export interface PlainCompany {
  readonly since: number;
  readonly day: string;
}

/** The mode for a board reading and the plain company the care memory holds. */
export function careModeOf(
  board: Pick<BoardSnapshot, 'phase' | 'desk' | 'now'>,
  plain: PlainCompany | null,
): CareMode {
  if (board.phase === 'crisis') return 'crisis';
  // Plain company ends with the day, as the crisis screen does.
  if (plain !== null && plain.day === board.now.day) return 'plain';
  if (board.desk !== null && board.desk.task.care !== 'none') return 'serious';
  return 'normal';
}

export function treatmentOf(mode: CareMode): CareTreatment {
  const normal = mode === 'normal';
  return {
    mode,
    tasksShown: mode !== 'crisis',
    pressure: normal,
    act: normal,
    selling: normal,
    notes: normal,
  };
}

/**
 * What he may say about a task:
 * - `none`: nothing (the crisis screen is open).
 * - `company`: plain, quiet company (`seriousCompany`, or `crisisCompany` after a crisis).
 * - `plain`: plain words only ("Written down."), because nobody trusted has screened it yet.
 * - `pointed`: anything in his voice.
 */
export type LineKind = 'none' | 'company' | 'plain' | 'pointed';

export function lineKindFor(task: Pick<Task, 'care' | 'screened'>, mode: CareMode): LineKind {
  if (mode === 'crisis') return 'none';
  if (mode === 'plain' || task.care !== 'none') return 'company';
  if (!task.screened) return 'plain';
  return 'pointed';
}

/**
 * Whether "It's fine, be funny" may lift the care on a task: only a task the screen has judged
 * serious. Never crisis, and never a task still waiting to be screened, which stays plain.
 */
export function canBeFunny(task: Pick<Task, 'care' | 'screened'>): boolean {
  return task.care === 'serious' && task.screened;
}
