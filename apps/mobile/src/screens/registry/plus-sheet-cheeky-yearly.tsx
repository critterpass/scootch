import { DRESSED_SHEET, MATERIALS_BOARD, plusState } from '../../features/plus/registry/plus-state';

/** The sheet as it opens: Cheeky, with yearly preselected and its trial on the action. */
export const plusSheetCheekyYearly = plusState({
  id: 'plus-sheet-cheeky-yearly',
  design: { board: MATERIALS_BOARD, section: DRESSED_SHEET, screen: 'Plus sheet · Foil · Yearly' },
  capture: { screen: 'sheet', attitude: 'cheeky', plan: 'yearly' },
});
