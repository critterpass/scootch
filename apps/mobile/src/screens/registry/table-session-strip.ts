import { togetherState } from '../../features/table/registry/together-state';

/** The table as a strip of critters above a running session. */
export const tableSessionStrip = togetherState({
  id: 'table-session-strip',
  design: null,
  undesignedReason:
    'The board draws a table and a session, but not the session with the table beside it',
  capture: 'session-strip',
});
