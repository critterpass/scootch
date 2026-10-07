import { catchState, TRAP_SETTING } from '../../features/session/registry/catch-fixtures';

/**
 * The envelope: it is addressed to the binder as the work goes on. Shown part-way through the session, with the task as
 * the headline and the trap as the quiet line under it.
 */
export const sessionCatchEnvelope = catchState({
  id: 'session-catch-envelope',
  kind: 'envelope',
  view: TRAP_SETTING,
  conditions: ['long-text'],
});
