import { togetherState } from '../../features/table/registry/together-state';

/** The table could not be reached; the one thing still starts. */
export const tableJoinUnreachable = togetherState({
  id: 'table-join-unreachable',
  design: null,
  undesignedReason: 'The board draws no joining without a connection',
  capture: 'join-unreachable',
});
