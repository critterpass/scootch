import { togetherState } from '../../features/table/registry/together-state';

/** An invite link that no longer works. */
export const tableJoinEnded = togetherState({
  id: 'table-join-ended',
  design: null,
  undesignedReason:
    'The board draws no link that has stopped working (expired, a closed table and a block all get this one answer from the server)',
  capture: 'join-ended',
});
