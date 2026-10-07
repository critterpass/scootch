import { togetherState } from '../../features/table/registry/together-state';

/** "Sit with someone" with Plus: a table opened here seats four, and no locked control is drawn. */
export const tableFindingPlus = togetherState({
  id: 'table-finding-plus',
  design: null,
  undesignedReason:
    'The board draws the lobby once; with Plus the same lobby says a table seats four and has no locked control',
  capture: 'lobby-plus',
});
