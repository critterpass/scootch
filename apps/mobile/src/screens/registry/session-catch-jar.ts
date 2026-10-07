import { catchState, TRAP_SETTING } from '../../features/session/registry/catch-fixtures';

/**
 * The jar: it lowers a little with every minute of work. Shown part-way through the session, with the task as
 * the headline and the trap as the quiet line under it.
 */
export const sessionCatchJar = catchState({
  id: 'session-catch-jar',
  kind: 'jar',
  view: TRAP_SETTING,
  conditions: ['long-text'],
});
