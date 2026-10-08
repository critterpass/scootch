import { PLUS_BOARD, plusState, THE_SHEET } from '../../features/plus/registry/plus-state';

/** The welcome after the yearly trial starts: the card arrives, and both dates are said once. */
export const plusWelcome = plusState({
  id: 'plus-welcome',
  design: { board: PLUS_BOARD, section: THE_SHEET, screen: 'Welcome · the card arrives' },
  capture: { screen: 'welcome', customer: 'trial' },
});
