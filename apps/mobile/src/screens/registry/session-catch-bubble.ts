import { catchState, TRAP_SETTING } from '../../features/session/registry/catch-fixtures';

/**
 * The bubble: it forms round him and lifts him off the floor. Shown part-way through the session, with the task as
 * the headline and the trap as the quiet line under it.
 */
export const sessionCatchBubble = catchState({
  id: 'session-catch-bubble',
  kind: 'bubble',
  view: TRAP_SETTING,
  conditions: ['long-text'],
});
