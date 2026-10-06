import { PLUS_BOARD, plusState, THE_SHEET } from '../../features/plus/registry/plus-state';

/** The sheet as it opens: Cheeky, with yearly preselected and its trial on the action. */
export const plusSheetCheekyYearly = plusState({
  id: 'plus-sheet-cheeky-yearly',
  design: { board: PLUS_BOARD, section: THE_SHEET, screen: 'Plus sheet · Cheeky · Yearly' },
  capture: { screen: 'sheet', attitude: 'cheeky', plan: 'yearly' },
});
