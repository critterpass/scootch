import { localDateTime, type Instant } from '../day';

/** Fewer ended sessions than this and nothing is said about habits at all. */
export const MIN_SESSIONS_TO_LEARN = 7;
/** A length counts as one the user finishes when they started it this often and finished this share. */
export const MIN_STARTS_PER_LENGTH = 3;
export const RELIABLE_FINISH_RATE = 0.7;

/** One ended session. A running session is not history yet. */
export interface PastSession {
  readonly startedAt: Instant;
  readonly plannedMinutes: number;
  readonly finished: boolean;
}

export interface LengthRecord {
  readonly minutes: number;
  readonly started: number;
  readonly finished: number;
  /** `finished` over `started`, 0 to 1. */
  readonly rate: number;
}

export type Habits =
  /** Too little history: no number is offered, not even a default. */
  | { readonly kind: 'not_enough_yet' }
  | {
      readonly kind: 'learned';
      /** The local hour, 0 to 23, around which most sessions started. */
      readonly usualStartHour: number;
      /** The length finished most often; `null` when nothing has been finished. */
      readonly usualFinishedMinutes: number | null;
      /** Shortest length first. */
      readonly byLength: readonly LengthRecord[];
      readonly suggestedReminderHour: number;
      /** The size of the next ask; `null` when nothing has been finished. */
      readonly suggestedAskMinutes: number | null;
    };

/**
 * The hour most sessions started around. Each hour is scored with its two neighbours, across
 * midnight too, so a habit that straddles two hours still wins and a few odd days cannot move it.
 */
export function usualStartHour(sessions: readonly PastSession[], timeZone: string): number | null {
  if (sessions.length === 0) return null;
  const starts = new Array<number>(24).fill(0);
  for (const session of sessions) {
    const { hour } = localDateTime(session.startedAt, timeZone);
    starts[hour] = (starts[hour] ?? 0) + 1;
  }
  const at = (hour: number) => starts[(hour + 24) % 24] ?? 0;
  let best = 0;
  let bestScore = -1;
  for (let hour = 0; hour < 24; hour += 1) {
    // Doubling the hour's own starts breaks a tie towards the hour itself, then the earlier hour.
    const score = at(hour - 1) + 2 * at(hour) + at(hour + 1);
    if (score > bestScore) [best, bestScore] = [hour, score];
  }
  return best;
}

export function completionByLength(sessions: readonly PastSession[]): LengthRecord[] {
  const byMinutes = new Map<number, { started: number; finished: number }>();
  for (const session of sessions) {
    const record = byMinutes.get(session.plannedMinutes) ?? { started: 0, finished: 0 };
    record.started += 1;
    if (session.finished) record.finished += 1;
    byMinutes.set(session.plannedMinutes, record);
  }
  return [...byMinutes.entries()]
    .sort(([a], [b]) => a - b)
    .map(([minutes, { started, finished }]) => ({
      minutes,
      started,
      finished,
      rate: finished / started,
    }));
}

/** The length finished most often, the shorter one on a tie. */
function mostFinished(byLength: readonly LengthRecord[]): number | null {
  let best: LengthRecord | null = null;
  for (const record of byLength) {
    if (record.finished > (best?.finished ?? 0)) best = record;
  }
  return best?.minutes ?? null;
}

/** The longest length the user reliably finishes; failing that, the shortest one they ever have. */
function nextAskMinutes(byLength: readonly LengthRecord[]): number | null {
  const reliable = byLength.filter(
    (record) => record.started >= MIN_STARTS_PER_LENGTH && record.rate >= RELIABLE_FINISH_RATE,
  );
  const fallback = byLength.find((record) => record.finished > 0);
  return (reliable.at(-1) ?? fallback)?.minutes ?? null;
}

/** Counting and dividing, on the phone. No model, and no guess when there is little to count. */
export function learnHabits(sessions: readonly PastSession[], timeZone: string): Habits {
  const hour = sessions.length < MIN_SESSIONS_TO_LEARN ? null : usualStartHour(sessions, timeZone);
  if (hour === null) return { kind: 'not_enough_yet' };
  const byLength = completionByLength(sessions);
  return {
    kind: 'learned',
    usualStartHour: hour,
    usualFinishedMinutes: mostFinished(byLength),
    byLength,
    suggestedReminderHour: hour,
    suggestedAskMinutes: nextAskMinutes(byLength),
  };
}
