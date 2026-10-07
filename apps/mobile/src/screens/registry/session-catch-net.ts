import { catchState, TRAP_SETTING } from '../../features/session/registry/catch-fixtures';

/**
 * The net: he flits about until the work grounds him. Shown part-way through the session, with the task as
 * the headline and the trap as the quiet line under it.
 */
export const sessionCatchNet = catchState({
  id: 'session-catch-net',
  kind: 'net',
  view: TRAP_SETTING,
  conditions: ['long-text'],
});
