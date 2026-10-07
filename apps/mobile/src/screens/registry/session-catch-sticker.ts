import { catchState, TRAP_SETTING } from '../../features/session/registry/catch-fixtures';

/**
 * The sticker: the cut line closes round him as the work goes on. Shown part-way through the session, with the task as
 * the headline and the trap as the quiet line under it.
 */
export const sessionCatchSticker = catchState({
  id: 'session-catch-sticker',
  kind: 'sticker',
  view: TRAP_SETTING,
  conditions: ['long-text'],
});
