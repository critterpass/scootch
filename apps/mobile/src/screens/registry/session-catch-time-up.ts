import { catchState } from '../../features/session/registry/catch-fixtures';

/**
 * Time is up: Scootch asks whether the thing was really done. Only a yes unlocks the catch.
 */
export const sessionCatchTimeUp = catchState({
  id: 'session-catch-time-up',
  kind: 'jar',
  view: { kind: 'finish', control: 'catch', timeUp: true },
  changes: (_language) => ({ fraction: 0, minutesLeft: 0 }),
});
