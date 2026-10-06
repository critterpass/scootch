import { PLUS_BOARD, plusState, THE_SHEET } from '../../features/plus/registry/plus-state';

/** The sheet opened from "One more": the line fits the moment. */
export const plusSheetOneMore = plusState({
  id: 'plus-sheet-one-more',
  design: { board: PLUS_BOARD, section: THE_SHEET, screen: 'Locked control · One more' },
  capture: { screen: 'sheet', attitude: 'cheeky', plan: 'yearly', oneMore: true },
});
