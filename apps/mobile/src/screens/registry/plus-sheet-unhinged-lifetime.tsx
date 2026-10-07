import { plusState } from '../../features/plus/registry/plus-state';

/** The sheet on lifetime: bought once, and the small print says nothing renews. */
export const plusSheetUnhingedLifetime = plusState({
  id: 'plus-sheet-unhinged-lifetime',
  design: null,
  undesignedReason:
    'The board draws the dressed-up sheet on yearly only; on lifetime the foil edge moves to that plan, the action buys once and the small print says nothing renews.',
  capture: { screen: 'sheet', attitude: 'unhinged', plan: 'lifetime' },
});
