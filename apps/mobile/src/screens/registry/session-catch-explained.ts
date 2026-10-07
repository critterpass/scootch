import { catchState } from '../../features/session/registry/catch-fixtures';

/**
 * Before the very first catch: how catching works, and the start is the person's to press.
 */
export const sessionCatchExplained = catchState({
  id: 'session-catch-explained',
  kind: 'jar',
  view: { kind: 'coach' },
  changes: (_language) => ({ fraction: 1, minutesLeft: 10 }),
});
