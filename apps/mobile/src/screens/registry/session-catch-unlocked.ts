import { catchState } from '../../features/session/registry/catch-fixtures';

/**
 * "I'm done" said before time was up: the trap is set and the gesture is unlocked.
 */
export const sessionCatchUnlocked = catchState({
  id: 'session-catch-unlocked',
  kind: 'jar',
  view: { kind: 'finish', control: 'catch', timeUp: false },
  changes: (_language) => ({ fraction: 0.3, minutesLeft: 3 }),
});
