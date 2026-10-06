import { togetherState } from '../../features/table/registry/together-state';

/** An invite to a table with no free seat. */
export const tableJoinFull = togetherState({
  id: 'table-join-full',
  design: null,
  undesignedReason: 'The board draws no fifth person arriving',
  capture: 'join-full',
});
