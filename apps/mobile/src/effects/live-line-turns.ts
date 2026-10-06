import type { Instant } from '@scootch/domain';

/** How often the Live Activity's line turns over to the next of the session's working lines. */
export const LIVE_LINE_EVERY_MS = 3 * 60_000;

/**
 * The moments within a session at which the Live Activity's line turns, soonest first. They are
 * counted back from the end, so the app and the widget extension land on the same instants from
 * the end time alone.
 */
export function liveLineTurns(startedAt: Instant, endsAt: Instant): Instant[] {
  const turns: Instant[] = [];
  for (let at = endsAt - LIVE_LINE_EVERY_MS; at > startedAt; at -= LIVE_LINE_EVERY_MS) {
    turns.unshift(at);
  }
  return turns;
}

/** The next turn after `now`, or the end of the session when no turn is left. */
export function nextLiveLineTurn(now: Instant, endsAt: Instant): Instant {
  if (now >= endsAt) return endsAt;
  const turnsLeft = Math.ceil((endsAt - now) / LIVE_LINE_EVERY_MS) - 1;
  return turnsLeft <= 0 ? endsAt : endsAt - turnsLeft * LIVE_LINE_EVERY_MS;
}
