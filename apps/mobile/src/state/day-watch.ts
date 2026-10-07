import { getCalendars } from 'expo-localization';

import { MINUTE_MS, nextScootchDayStart } from '@scootch/domain';

import { systemClock, systemTimers } from '../effects/native-adapters';

/**
 * Tells the app when the clock passes the start of each new day while it is open, so a day left
 * open overnight turns at its boundary without waiting for the app to come forward. Returns the
 * way to stop watching.
 */
export function watchDayTurn(onTurn: () => void): () => void {
  let stop = () => undefined as void;
  const watch = () => {
    const zone = getCalendars()[0]?.timeZone ?? 'UTC';
    const now = systemClock.now();
    const wait = Math.max(MINUTE_MS, nextScootchDayStart(now, zone) - now);
    stop = systemTimers.set(wait + 1000, () => {
      onTurn();
      watch();
    });
  };
  watch();
  return () => stop();
}
