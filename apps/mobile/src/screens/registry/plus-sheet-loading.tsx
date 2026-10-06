import { plusState } from '../../features/plus/registry/plus-state';

/** The sheet while the store's prices are on their way. */
export const plusSheetLoading = plusState({
  id: 'plus-sheet-loading',
  design: null,
  undesignedReason:
    'The board draws the sheet with its prices; before the store has answered there are none to show, so the plans and the action wait and "Not now" stays in plain sight.',
  capture: { screen: 'sheet', attitude: 'cheeky', plan: 'yearly', phase: 'loading' },
});
