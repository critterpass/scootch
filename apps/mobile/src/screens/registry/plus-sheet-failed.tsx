import { plusState } from '../../features/plus/registry/plus-state';

/** The sheet after a purchase that did not go through. */
export const plusSheetFailed = plusState({
  id: 'plus-sheet-failed',
  design: null,
  undesignedReason:
    'The board has no failed purchase; the sheet stays as it was with one plain line saying nothing was charged.',
  capture: { screen: 'sheet', attitude: 'cheeky', plan: 'yearly', phase: 'failed' },
});
