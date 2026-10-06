import { plusState } from '../../features/plus/registry/plus-state';

/** The sheet while the App Store has the purchase. */
export const plusSheetPurchasing = plusState({
  id: 'plus-sheet-purchasing',
  design: null,
  undesignedReason:
    "Apple's own purchase sheet covers this state on a phone; behind it the action waits so it cannot be pressed twice.",
  capture: { screen: 'sheet', attitude: 'cheeky', plan: 'yearly', phase: 'purchasing' },
});
