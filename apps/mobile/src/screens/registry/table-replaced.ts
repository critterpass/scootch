import { togetherState } from '../../features/table/registry/together-state';

/** The table was opened on another device. */
export const tableReplaced = togetherState({
  id: 'table-replaced',
  design: null,
  undesignedReason: 'The board does not draw the same person sitting down on a second device',
  capture: 'replaced',
});
