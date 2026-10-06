import { togetherState } from '../../features/table/registry/together-state';

/** The strip while the line to the table is down. */
export const tableSessionStripReconnecting = togetherState({
  id: 'table-session-strip-reconnecting',
  design: null,
  undesignedReason: 'The board draws no dropped line during a session',
  capture: 'session-strip-reconnecting',
});
