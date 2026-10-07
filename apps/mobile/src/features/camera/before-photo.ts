import { DAY_MS, type MonsterRow, type TaskRow } from '@scootch/domain';

/** The photo a session began with: where it is kept, and what the phone found in it. */
export interface BeforePhoto {
  readonly uri: string;
  readonly mode: 'desk' | 'room';
  /** How many separate things the phone found in it. */
  readonly things: number;
  /** When the step was chosen, in milliseconds. */
  readonly takenAt: number;
}

/** A stored photo record, checked field by field. Anything unreadable counts as none kept. */
export function beforeFromStored(value: unknown): BeforePhoto | null {
  if (typeof value !== 'object' || value === null) return null;
  const { uri, mode, things, takenAt } = value as Record<string, unknown>;
  if (typeof uri !== 'string' || uri === '') return null;
  if (mode !== 'desk' && mode !== 'room') return null;
  if (typeof things !== 'number' || !Number.isInteger(things) || things < 0) return null;
  if (typeof takenAt !== 'number' || !Number.isFinite(takenAt)) return null;
  return { uri, mode, things, takenAt };
}

/** A step from the camera becomes a hatched monster within moments; this long covers a slow call. */
export const HATCH_WINDOW_MS = 10 * 60 * 1000;

/** The first photo is kept for a day at most, asked about or not. */
export function beforeIsStale(before: BeforePhoto, now: number): boolean {
  return now - before.takenAt >= DAY_MS || now < before.takenAt;
}

export interface KeptFacts {
  readonly monsters: readonly MonsterRow[];
  readonly tasks: ReadonlyMap<string, TaskRow>;
}

/**
 * Whether to ask for the second photo, and the minutes the session took. Asked only when the task
 * that began with the photo was caught: its monster hatched just after the step was chosen and has
 * since been caught. Never for a task that was not finished, and never for a serious one.
 *
 * The task is found by when its monster hatched, because the one thing that comes back may be
 * worded differently from the step. A different thing typed in the same few minutes would be taken
 * for it; the cost is one offer of a photo, which "Skip" answers.
 */
export function afterOffer(
  before: BeforePhoto | null,
  kept: KeptFacts | null,
  now: number,
): { readonly minutes: number } | null {
  if (before === null || kept === null || beforeIsStale(before, now)) return null;
  const caught = kept.monsters
    .filter((monster) => {
      const hatched = Date.parse(monster.hatchedAt);
      return (
        monster.origin === 'task' &&
        monster.caughtAt !== null &&
        hatched >= before.takenAt &&
        hatched - before.takenAt <= HATCH_WINDOW_MS &&
        kept.tasks.get(monster.taskId)?.screen === 'pass'
      );
    })
    .sort((a, b) => Date.parse(a.hatchedAt) - Date.parse(b.hatchedAt))[0];
  if (caught === undefined) return null;
  return { minutes: caught.catchMinutes ?? 0 };
}

/**
 * The figures under the two photos. Only what the phone can count: the minutes, and how many
 * fewer things it finds now. A figure of nought is left out, and fewer things is never claimed
 * when the second photo holds as many or more.
 */
export function afterFigures(
  before: BeforePhoto,
  thingsNow: number,
  minutes: number,
): { readonly minutes: number | null; readonly gone: number | null } {
  const gone = before.things - thingsNow;
  return { minutes: minutes > 0 ? minutes : null, gone: gone > 0 ? gone : null };
}
