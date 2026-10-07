import { DRESSED_SHEET, MATERIALS_BOARD, plusState } from '../../features/plus/registry/plus-state';

/** The welcome after the yearly trial starts: the card arrives, and both dates are said once. */
export const plusWelcome = plusState({
  id: 'plus-welcome',
  design: { board: MATERIALS_BOARD, section: DRESSED_SHEET, screen: 'Welcome · the card arrives' },
  capture: { screen: 'welcome', customer: 'trial' },
});
