import type { DayEvent } from '../../state/day-types';

/**
 * Starts the set task alone, for `minutes`: the same two events Start sends on the one screen.
 * A table that was not sat at, or an account that was not made, never stands between a person and
 * their start.
 */
export async function startAlone(
  dispatch: (event: DayEvent) => Promise<void>,
  minutes: number,
): Promise<void> {
  await dispatch({ type: 'session_set', minutes, treat: null });
  await dispatch({ type: 'session', event: { type: 'started' } });
}
