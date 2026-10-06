import { PLUS_BOARD, plusState, THE_SHEET } from '../../features/plus/registry/plus-state';

/** The sheet on monthly: a plain subscribe, and no trial promised. */
export const plusSheetSoftMonthly = plusState({
  id: 'plus-sheet-soft-monthly',
  design: { board: PLUS_BOARD, section: THE_SHEET, screen: 'Plus sheet · Soft · Monthly' },
  capture: { screen: 'sheet', attitude: 'soft', plan: 'monthly' },
});
