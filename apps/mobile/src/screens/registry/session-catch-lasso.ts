import { catchState, TRAP_SETTING } from '../../features/session/registry/catch-fixtures';

/**
 * The lasso: he runs laps until the work wears him out. Shown part-way through the session, with the task as
 * the headline and the trap as the quiet line under it.
 */
export const sessionCatchLasso = catchState({
  id: 'session-catch-lasso',
  kind: 'lasso',
  view: TRAP_SETTING,
  conditions: ['long-text'],
});
