import { appHttp } from '../api/app-http';
import { createHuntingApi } from '../api/hunting-api';
import { systemTimers } from '../effects/native-adapters';

import { othersHuntingShown, watchHunting, type HuntingWatchDeps } from './others-hunting';

let watching = false;

/**
 * Starts the one watch that tells the server when a session starts and ends, and reads how many
 * others are in one while it runs. Asked for by the session's screen the first time it is drawn;
 * from then on it lasts as long as the app, and asking again changes nothing.
 */
export function keepOthersHunting(
  store: HuntingWatchDeps['store'],
  table: HuntingWatchDeps['table'],
): void {
  if (watching) return;
  watching = true;
  watchHunting({
    store,
    table,
    // The app's one client, already made by the day store; the language is only its fallback.
    api: createHuntingApi(appHttp(() => 'en')),
    timers: systemTimers,
    show: (count) => othersHuntingShown.set(count),
  });
}
