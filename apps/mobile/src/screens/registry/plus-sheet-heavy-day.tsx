import { plusState } from '../../features/plus/registry/plus-state';

/** The sheet opened on a day with something heavy in it: the plans, and nothing spoken. */
export const plusSheetHeavyDay = plusState({
  id: 'plus-sheet-heavy-day',
  design: null,
  undesignedReason:
    'The board always gives the sheet a line. On a day that held a serious task nothing about Plus is spoken, so the sheet a person opens themselves shows the plans without one.',
  capture: { screen: 'sheet', attitude: 'cheeky', plan: 'yearly', heavyDay: true },
});
