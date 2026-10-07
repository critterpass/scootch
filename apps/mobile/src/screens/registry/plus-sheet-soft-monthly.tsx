import { plusState } from '../../features/plus/registry/plus-state';

/** The sheet on monthly: a plain subscribe, and no trial promised. */
export const plusSheetSoftMonthly = plusState({
  id: 'plus-sheet-soft-monthly',
  design: null,
  undesignedReason:
    'The board draws the dressed-up sheet on yearly only; on monthly the foil edge moves to that plan, the action is a plain subscribe and the small print promises no trial.',
  capture: { screen: 'sheet', attitude: 'soft', plan: 'monthly' },
});
