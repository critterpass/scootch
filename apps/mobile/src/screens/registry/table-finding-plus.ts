import { togetherState } from '../../features/table/registry/together-state';

/** "Sit with someone" with Plus: "Open a table" opens one. */
export const tableFindingPlus = togetherState({
  id: 'table-finding-plus',
  design: null,
  undesignedReason:
    'The board draws the lobby once, with a strangers option that is not built; with Plus the same lobby has "Open a table" unlocked',
  capture: 'lobby-plus',
});
