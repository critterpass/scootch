import type { HuntRecord } from '@scootch/domain';

const instantOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * The hunt record as the App Group holds it. Swift leaves out what is nil, so a missing field is
 * `null`; anything that is not a whole record is no record.
 */
export function readHunt(stored: string | null): HuntRecord | null {
  if (stored === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { taskId, startedAt, beginsAt, endsAt, parkedText, ...rest } = value as Record<
    string,
    unknown
  >;
  const [started, begins, ends] = [startedAt, beginsAt, endsAt].map(instantOrNull);
  if (typeof taskId !== 'string' || taskId === '') return null;
  if (started == null || begins == null || ends == null || ends <= begins) return null;
  return {
    taskId,
    startedAt: started,
    beginsAt: begins,
    endsAt: ends,
    pausedAt: instantOrNull(rest['pausedAt']),
    parkedAt: instantOrNull(rest['parkedAt']),
    parkedText: typeof parkedText === 'string' ? parkedText : null,
    caughtAt: instantOrNull(rest['caughtAt']),
    stoppedAt: instantOrNull(rest['stoppedAt']),
  };
}
