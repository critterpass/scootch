import { catchState, TRAP_SETTING } from '../../features/session/registry/catch-fixtures';

/**
 * The vacuum: it charges while the work goes on, one cell at a time. Shown part-way through the session, with the task as
 * the headline and the trap as the quiet line under it.
 */
export const sessionCatchVacuum = catchState({
  id: 'session-catch-vacuum',
  kind: 'vacuum',
  view: TRAP_SETTING,
  conditions: ['long-text'],
});
