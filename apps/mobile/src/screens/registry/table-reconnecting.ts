import { togetherState } from '../../features/table/registry/together-state';

/** The line to the table dropped: said plainly, without alarm. */
export const tableReconnecting = togetherState({
  id: 'table-reconnecting',
  design: null,
  undesignedReason:
    'The board draws no dropped line; the seat is kept for ten minutes, so it is said in one calm line',
  capture: 'reconnecting',
});
