import { togetherState } from '../../features/table/registry/together-state';

/** Tables are not available for this account. */
export const tableJoinBanned = togetherState({
  id: 'table-join-banned',
  design: null,
  undesignedReason: 'The board draws no banned account',
  capture: 'join-banned',
});
