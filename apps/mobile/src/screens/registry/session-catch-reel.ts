import { catchState, TRAP_SETTING } from '../../features/session/registry/catch-fixtures';

/**
 * The reel: the work winds him in from the horizon. Shown part-way through the session, with the task as
 * the headline and the trap as the quiet line under it.
 */
export const sessionCatchReel = catchState({
  id: 'session-catch-reel',
  kind: 'reel',
  view: TRAP_SETTING,
  conditions: ['long-text'],
});
