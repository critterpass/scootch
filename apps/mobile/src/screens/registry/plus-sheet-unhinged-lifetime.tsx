import { PLUS_BOARD, plusState, THE_SHEET } from '../../features/plus/registry/plus-state';

/** The sheet on lifetime: bought once, and the small print says nothing renews. */
export const plusSheetUnhingedLifetime = plusState({
  id: 'plus-sheet-unhinged-lifetime',
  design: { board: PLUS_BOARD, section: THE_SHEET, screen: 'Plus sheet · Unhinged · Lifetime' },
  capture: { screen: 'sheet', attitude: 'unhinged', plan: 'lifetime' },
});
